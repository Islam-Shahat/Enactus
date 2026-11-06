-- =====================================================================
-- Migration: 20261106094500_notify_dashboard_on_contact_messages.sql
-- Description:
-- 1. Create public.dispatch_contact_message_notifications(p_message_id uuid)
--    to create in-app notifications for admins & leadership on contact/sponsor messages.
-- 2. Add trigger trg_contact_messages_notify on public.contact_messages.
-- 3. Update public.submit_contact_message to explicitly dispatch notifications.
-- 4. Backfill notifications for existing contact messages so previously sent messages
--    appear immediately in the dashboard notifications center.
-- =====================================================================

-- 1. Dispatch helper
create or replace function public.dispatch_contact_message_notifications(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_msg record;
  v_admin record;
  v_title text;
  v_body text;
begin
  select * into v_msg
  from public.contact_messages
  where id = p_message_id;

  if not found then
    return;
  end if;

  v_title := case
    when v_msg.kind = 'sponsor' then 'طلب رعاية وشراكة جديد'
    when v_msg.kind = 'feedback' then 'استبيان / رأي جديد'
    else 'رسالة تواصل جديدة'
  end;

  v_body := 'من: ' || v_msg.full_name ||
            coalesce(' (' || v_msg.organization || ')', '') ||
            ' - ' || coalesce(v_msg.subject, 'رسالة جديدة') ||
            ': ' || substring(v_msg.message from 1 for 120);

  for v_admin in (
    select distinct user_id
    from public.user_roles
    where role in ('super_admin', 'president', 'vice_president', 'pr_admin', 'hr_admin')
    union
    select id as user_id
    from public.profiles
    where not exists (
      select 1 from public.user_roles
      where role in ('super_admin', 'president', 'vice_president', 'pr_admin', 'hr_admin')
    )
  ) loop
    -- Insert notification only if not already created for this admin & message
    if not exists (
      select 1 from public.notifications
      where user_id = v_admin.user_id
        and (data->>'message_id') = p_message_id::text
    ) then
      insert into public.notifications (
        user_id,
        type,
        title,
        body,
        link,
        data,
        created_at
      ) values (
        v_admin.user_id,
        'new_contact_message',
        v_title,
        v_body,
        '/dashboard/notifications',
        jsonb_build_object(
          'message_id', v_msg.id,
          'kind', v_msg.kind,
          'full_name', v_msg.full_name,
          'email', v_msg.email,
          'phone', v_msg.phone,
          'organization', v_msg.organization,
          'subject', v_msg.subject,
          'message', v_msg.message,
          'package_interest', v_msg.package_interest
        ),
        v_msg.created_at
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.dispatch_contact_message_notifications(uuid) to anon, authenticated, service_role;

-- 2. Trigger on contact_messages
create or replace function public.trg_contact_messages_notify_handler()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  perform public.dispatch_contact_message_notifications(new.id);
  return new;
end;
$$;

drop trigger if exists trg_contact_messages_notify on public.contact_messages;
create trigger trg_contact_messages_notify
  after insert on public.contact_messages
  for each row execute function public.trg_contact_messages_notify_handler();

-- 3. Update public.submit_contact_message RPC
create or replace function public.submit_contact_message(
  p_full_name text,
  p_email text,
  p_message text,
  p_subject text default null,
  p_phone text default null,
  p_organization text default null,
  p_kind text default 'contact',
  p_package_interest text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_clean_name text;
  v_clean_email text;
  v_clean_message text;
  v_clean_subject text;
  v_clean_phone text;
  v_clean_org text;
  v_clean_package text;
  v_clean_kind text;
  v_recent_count int;
  v_new_id uuid;
begin
  -- 1. Sanitize text inputs
  v_clean_name := trim(coalesce(p_full_name, ''));
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_message := trim(coalesce(p_message, ''));
  v_clean_subject := nullif(trim(coalesce(p_subject, '')), '');
  v_clean_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_clean_org := nullif(trim(coalesce(p_organization, '')), '');
  v_clean_package := nullif(trim(coalesce(p_package_interest, '')), '');

  -- 2. Validate kind
  v_clean_kind := lower(trim(coalesce(p_kind, 'contact')));
  if v_clean_kind not in ('contact', 'sponsor', 'partnership', 'feedback', 'other') then
    v_clean_kind := 'contact';
  end if;

  -- 3. Validate mandatory fields
  if length(v_clean_name) < 2 then
    return jsonb_build_object(
      'ok', false,
      'error', 'الاسم مطلوب ويجب ألا يقل عن حرفين.'
    );
  end if;

  if length(v_clean_email) < 5 or position('@' in v_clean_email) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'الرجاء إدخال بريد إلكتروني صالح.'
    );
  end if;

  if length(v_clean_message) < 5 then
    return jsonb_build_object(
      'ok', false,
      'error', 'نص الرسالة مطلوب ويجب ألا يقل عن 5 أحرف.'
    );
  end if;

  -- 4. Rate limiting: max 10 in 1 hour
  select count(*) into v_recent_count
  from public.contact_messages
  where email = v_clean_email
    and created_at >= (now() - interval '1 hour');

  if v_recent_count >= 10 then
    return jsonb_build_object(
      'ok', false,
      'error', 'تم تجاوز الحد المسموح به من الرسائل مؤقتاً، يرجى المحاولة لاحقاً.'
    );
  end if;

  -- 5. Insert contact message record
  insert into public.contact_messages (
    kind,
    full_name,
    email,
    phone,
    organization,
    subject,
    message,
    package_interest,
    status
  ) values (
    v_clean_kind,
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    v_clean_org,
    v_clean_subject,
    v_clean_message,
    v_clean_package,
    'new'
  )
  returning id into v_new_id;

  -- 6. Trigger dispatcher explicitly
  perform public.dispatch_contact_message_notifications(v_new_id);

  return jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'message', 'تم إرسال رسالتك بنجاح، وسنتواصل معك قريباً.'
  );
end;
$$;

grant execute on function public.submit_contact_message(text, text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- 4. Backfill notifications for all existing unnotified contact messages
do $$
declare
  r record;
begin
  for r in select id from public.contact_messages loop
    perform public.dispatch_contact_message_notifications(r.id);
  end loop;
end;
$$;
