-- supabase/migrations/20261105205500_secure_attendance_recording.sql
-- Fix attendance_write RLS policy to include oc_admin, and add atomic record_session_attendance RPC function.

-- 1. Update attendance_write RLS policy to include oc_admin
drop policy if exists attendance_write on public.attendance;

create policy attendance_write on public.attendance for all to authenticated
  using (
    (select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator']))
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and (select private.is_head_of(s.committee_id))
    )
  )
  with check (
    (select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator']))
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and (select private.is_head_of(s.committee_id))
    )
  );

-- 2. Performance indexes on attendance
create index if not exists idx_attendance_session_user on public.attendance (session_id, user_id);
create index if not exists idx_attendance_session_status on public.attendance (session_id, status);

-- 3. Dedicated atomic RPC function for recording session attendance (QR scan or manual code)
create or replace function public.record_session_attendance(
  p_session_id uuid,
  p_identifier text,
  p_status text default 'present',
  p_method text default 'qr',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_session record;
  v_clean text := trim(coalesce(p_identifier, ''));
  v_target_user_id uuid := null;
  v_target_profile record;
  v_parts text[];
  v_uuid_candidate text;
  v_member_code_candidate text;
  v_existing record;
  v_has_access boolean := false;
begin
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED', 'message', 'User session expired');
  end if;

  if p_session_id is null or v_clean = '' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_INPUT', 'message', 'Session ID and identifier are required');
  end if;

  -- 1. Fetch Session
  select s.id, s.season_id, s.committee_id, s.title, s.check_in_open
  into v_session
  from public.attendance_sessions s
  where s.id = p_session_id;

  if v_session.id is null then
    return jsonb_build_object('ok', false, 'error', 'SESSION_NOT_FOUND', 'message', 'Session not found');
  end if;

  -- 2. Check Caller Privileges (Super Admin, President, VP, HR Admin, OC Admin, Coordinator, or Committee Head)
  select (
    private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator'])
    or (v_session.committee_id is not null and private.is_head_of(v_session.committee_id))
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    return jsonb_build_object('ok', false, 'error', 'FORBIDDEN', 'message', 'Insufficient privileges to record attendance');
  end if;

  -- 3. Resolve Identifier to user_id
  -- (a) ENACTUS-MEMBER:<userId>:<memberCode>:<sessionId>
  if v_clean like 'ENACTUS-MEMBER:%' then
    v_parts := string_to_array(v_clean, ':');
    v_uuid_candidate := v_parts[2];
    v_member_code_candidate := v_parts[3];

    if v_uuid_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      select p.id into v_target_user_id from public.profiles p where p.id = v_uuid_candidate::uuid;
    end if;

    if v_target_user_id is null and v_member_code_candidate is not null then
      select p.id into v_target_user_id from public.profiles p where p.member_code = v_member_code_candidate;
    end if;
  end if;

  -- (b) Raw UUID
  if v_target_user_id is null and v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select p.id into v_target_user_id from public.profiles p where p.id = v_clean::uuid;
  end if;

  -- (c) Member code (e.g. 2026001)
  if v_target_user_id is null then
    select p.id into v_target_user_id from public.profiles p where p.member_code = v_clean;
  end if;

  -- (d) 14-digit National ID in profile_private
  if v_target_user_id is null and v_clean ~ '^[0-9]{14}$' then
    select pp.user_id into v_target_user_id from public.profile_private pp where pp.national_id = v_clean;
  end if;

  -- (e) Email in profile_private
  if v_target_user_id is null and v_clean like '%@%' then
    select pp.user_id into v_target_user_id from public.profile_private pp where lower(pp.email) = lower(v_clean);
  end if;

  if v_target_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'MEMBER_NOT_FOUND',
      'message', 'لم يتم العثور على أي عضو بهذا الكود: ' || v_clean
    );
  end if;

  -- 4. Fetch target profile data
  select p.id, p.full_name_ar, p.full_name_en, p.member_code, p.avatar_url, p.status
  into v_target_profile
  from public.profiles p
  where p.id = v_target_user_id;

  if v_target_profile.id is null then
    return jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND', 'message', 'Member profile missing');
  end if;

  -- 5. Check if already marked present
  select a.id, a.status, a.checked_in_at
  into v_existing
  from public.attendance a
  where a.session_id = p_session_id and a.user_id = v_target_user_id;

  if v_existing.id is not null and v_existing.status in ('present', 'late') then
    return jsonb_build_object(
      'ok', true,
      'already_recorded', true,
      'status', v_existing.status,
      'checked_in_at', v_existing.checked_in_at,
      'member', jsonb_build_object(
        'id', v_target_profile.id,
        'full_name_ar', v_target_profile.full_name_ar,
        'full_name_en', v_target_profile.full_name_en,
        'member_code', v_target_profile.member_code,
        'avatar_url', v_target_profile.avatar_url
      )
    );
  end if;

  -- 6. Upsert Attendance Record
  insert into public.attendance (
    session_id,
    user_id,
    status,
    method,
    recorded_by,
    checked_in_at,
    notes
  ) values (
    p_session_id,
    v_target_user_id,
    coalesce(p_status, 'present'),
    coalesce(p_method, 'qr'),
    v_caller_id,
    now(),
    p_notes
  )
  on conflict (session_id, user_id) do update set
    status = excluded.status,
    method = excluded.method,
    recorded_by = excluded.recorded_by,
    checked_in_at = excluded.checked_in_at,
    notes = coalesce(excluded.notes, attendance.notes);

  return jsonb_build_object(
    'ok', true,
    'already_recorded', false,
    'status', coalesce(p_status, 'present'),
    'checked_in_at', now(),
    'member', jsonb_build_object(
      'id', v_target_profile.id,
      'full_name_ar', v_target_profile.full_name_ar,
      'full_name_en', v_target_profile.full_name_en,
      'member_code', v_target_profile.member_code,
      'avatar_url', v_target_profile.avatar_url
    )
  );
end;
$$;

grant execute on function public.record_session_attendance(uuid, text, text, text, text) to authenticated, service_role;
