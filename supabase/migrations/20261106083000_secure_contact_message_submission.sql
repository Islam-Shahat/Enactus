-- =====================================================================
-- Migration: 20261106083000_secure_contact_message_submission.sql
-- Description:
-- 1. Create public.submit_contact_message RPC function (SECURITY DEFINER)
--    allowing public visitors to submit contact and sponsor messages directly,
--    enforcing server-side validation, sanitization, and rate-limiting
--    without hard dependency on external Edge Functions.
-- 2. Add insert policy on public.contact_messages for anon and authenticated
-- 3. Explicit GRANTs to anon and authenticated
-- =====================================================================

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
set search_path = ''
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

  -- 4. Rate limiting: prevent spam from same email (max 10 in 1 hour)
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

  -- 5. Insert record
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

  return jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'message', 'تم إرسال رسالتك بنجاح، وسنتواصل معك قريباً.'
  );
end;
$$;

-- Explicit GRANT for RPC
revoke all on function public.submit_contact_message(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- Allow direct insert policy as secondary fallback for anon and authenticated
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert to anon, authenticated
  with check (
    length(trim(coalesce(full_name, ''))) >= 2
    and length(trim(coalesce(email, ''))) >= 5
    and position('@' in email) > 0
    and length(trim(coalesce(message, ''))) >= 5
    and status = 'new'
  );

grant insert on public.contact_messages to anon, authenticated;
