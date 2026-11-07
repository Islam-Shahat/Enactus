-- Migration: 20261107200000_direct_member_messaging.sql
-- Description: RPC function enabling leadership, supervisors, committee heads, and HR to send targeted direct notifications to a specific member.

create or replace function public.send_member_message(
  p_recipient_id uuid,
  p_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_sender_name text;
  v_sender_role text;
  v_recipient_name text;
  v_notif_id uuid;
  v_is_authorized boolean := false;
begin
  -- 1. Ensure caller is authenticated
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- 2. Verify caller has one of the authorized roles:
  --    (super_admin, president, vice_president, hr_admin, committee_head, coordinator)
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_caller_id
      and ur.role in ('super_admin', 'president', 'vice_president', 'hr_admin', 'committee_head', 'coordinator')
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'Unauthorized: Only supervisors, leadership, committee heads, and HR can message members'
      using errcode = '42501';
  end if;

  -- 3. Validate inputs
  if p_recipient_id is null then
    raise exception 'Recipient ID is required' using errcode = '22023';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Message title cannot be empty' using errcode = '22023';
  end if;

  if coalesce(trim(p_body), '') = '' then
    raise exception 'Message content cannot be empty' using errcode = '22023';
  end if;

  -- 4. Verify recipient exists in profiles
  select coalesce(full_name_ar, full_name_en, 'عضو إناكتوس')
  into v_recipient_name
  from public.profiles
  where id = p_recipient_id;

  if not found then
    raise exception 'Recipient member not found' using errcode = '22023';
  end if;

  -- 5. Fetch sender's name and primary display role
  select coalesce(full_name_ar, full_name_en, 'مسؤول الفريق')
  into v_sender_name
  from public.profiles
  where id = v_caller_id;

  select case ur.role
    when 'super_admin' then 'مدير النظام'
    when 'president' then 'رئيس الفريق'
    when 'vice_president' then 'نائب الرئيس'
    when 'hr_admin' then 'الموارد البشرية (HR)'
    when 'committee_head' then coalesce('رئيس لجنة ' || c.name_ar, 'رئيس لجنة')
    when 'coordinator' then 'مشرف / منسق'
    else ur.role
  end
  into v_sender_role
  from public.user_roles ur
  left join public.committees c on c.id = ur.committee_id
  where ur.user_id = v_caller_id
  order by case ur.role
    when 'super_admin' then 1
    when 'president' then 2
    when 'vice_president' then 3
    when 'hr_admin' then 4
    when 'committee_head' then 5
    when 'coordinator' then 6
    else 7
  end
  limit 1;

  if v_sender_role is null then
    v_sender_role := 'مسؤول الفريق';
  end if;

  -- 6. Insert notification targeted ONLY to recipient member
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link,
    data
  ) values (
    p_recipient_id,
    'direct_message',
    trim(p_title),
    trim(p_body),
    '/dashboard/notifications',
    jsonb_build_object(
      'sender_id', v_caller_id,
      'sender_name', v_sender_name,
      'sender_role', v_sender_role,
      'subject', trim(p_title),
      'message', trim(p_body),
      'sent_at', now()
    )
  ) returning id into v_notif_id;

  -- 7. Audit log (non-blocking)
  begin
    insert into public.audit_logs (
      actor_id,
      action,
      table_name,
      row_id,
      new_data
    ) values (
      v_caller_id,
      'send_direct_message',
      'notifications',
      v_notif_id::text,
      jsonb_build_object(
        'recipient_id', p_recipient_id,
        'recipient_name', v_recipient_name,
        'title', trim(p_title)
      )
    );
  exception when others then
    -- audit failure must not prevent notification dispatch
  end;

  return jsonb_build_object(
    'ok', true,
    'notification_id', v_notif_id,
    'recipient_id', p_recipient_id,
    'recipient_name', v_recipient_name
  );
end;
$$;

grant execute on function public.send_member_message(uuid, text, text) to authenticated;

