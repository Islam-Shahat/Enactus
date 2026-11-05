-- =====================================================================
-- Migration: 20261105084000_fix_point_penalty_on_conflict.sql
-- Fix ON CONFLICT target for automatic attendance and overdue-task penalties.
-- The conflict target must match the existing partial unique index:
-- point_entries_source_source_id_user_rule_idx
-- ON public.point_entries (source, source_id, user_id, rule_id) WHERE source_id IS NOT NULL;
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ensure partial unique index exists
-- ---------------------------------------------------------------------
create unique index if not exists point_entries_source_source_id_user_rule_idx
  on public.point_entries (source, source_id, user_id, rule_id)
  where source_id is not null;

-- ---------------------------------------------------------------------
-- 2. Correct private.apply_attendance_penalties(p_session uuid)
-- ---------------------------------------------------------------------
create or replace function private.apply_attendance_penalties(p_session uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.attendance_sessions;
  v_rule_absent public.point_rules;
  v_rule_late public.point_rules;
  v_absent_count int := 0;
  v_late_count int := 0;
begin
  -- 1. Verify session exists and is closed
  select * into v_session
  from public.attendance_sessions
  where id = p_session;

  if not found then
    raise exception 'Attendance session not found' using errcode = 'P0002';
  end if;

  if v_session.check_in_open then
    raise exception 'Session must be closed before applying attendance penalties' using errcode = '22000';
  end if;

  -- 2. Fetch active rules
  select * into v_rule_absent
  from public.point_rules
  where code = 'absence_unexcused' and active = true
  limit 1;

  select * into v_rule_late
  from public.point_rules
  where code = 'late_arrival' and active = true
  limit 1;

  -- 3. Apply absent penalties
  if v_rule_absent.id is not null then
    with inserted as (
      insert into public.point_entries (
        user_id,
        season_id,
        committee_id,
        type,
        value,
        reason,
        source,
        source_id,
        rule_id,
        given_by
      )
      select
        a.user_id,
        v_session.season_id,
        v_session.committee_id,
        'penalty',
        v_rule_absent.value,
        'غياب غير معذور: ' || v_session.title,
        'attendance',
        v_session.id,
        v_rule_absent.id,
        null
      from public.attendance a
      where a.session_id = v_session.id
        and a.status = 'absent'
      on conflict (source, source_id, user_id, rule_id) where source_id is not null do nothing
      returning 1
    )
    select count(*) into v_absent_count from inserted;
  end if;

  -- 4. Apply late arrival penalties
  if v_rule_late.id is not null then
    with inserted as (
      insert into public.point_entries (
        user_id,
        season_id,
        committee_id,
        type,
        value,
        reason,
        source,
        source_id,
        rule_id,
        given_by
      )
      select
        a.user_id,
        v_session.season_id,
        v_session.committee_id,
        'penalty',
        v_rule_late.value,
        'تأخير عن الحضور: ' || v_session.title,
        'attendance',
        v_session.id,
        v_rule_late.id,
        null
      from public.attendance a
      where a.session_id = v_session.id
        and a.status = 'late'
      on conflict (source, source_id, user_id, rule_id) where source_id is not null do nothing
      returning 1
    )
    select count(*) into v_late_count from inserted;
  end if;

  return json_build_object(
    'ok', true,
    'session_id', p_session,
    'absent_penalties_awarded', v_absent_count,
    'late_penalties_awarded', v_late_count
  );
end;
$$;

revoke all on function private.apply_attendance_penalties(uuid) from public, anon, authenticated;
grant execute on function private.apply_attendance_penalties(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 3. Public RPC wrapper callable only by service_role (used by close-session Edge Function)
-- ---------------------------------------------------------------------
create or replace function public.apply_attendance_penalties(p_session uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.apply_attendance_penalties(p_session);
end;
$$;

revoke all on function public.apply_attendance_penalties(uuid) from public, anon, authenticated;
grant execute on function public.apply_attendance_penalties(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 4. Correct private.apply_overdue_task_penalties()
-- ---------------------------------------------------------------------
create or replace function private.apply_overdue_task_penalties()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule_late public.point_rules;
  v_count int := 0;
begin
  select * into v_rule_late
  from public.point_rules
  where code = 'task_late' and active = true
  limit 1;

  if v_rule_late.id is null then
    return json_build_object('ok', false, 'message', 'task_late rule is inactive or not found');
  end if;

  with inserted as (
    insert into public.point_entries (
      user_id,
      season_id,
      committee_id,
      type,
      value,
      reason,
      source,
      source_id,
      rule_id,
      given_by
    )
    select
      t.assignee_id,
      t.season_id,
      t.committee_id,
      'penalty',
      v_rule_late.value,
      'تأخر في تسليم المهمة: ' || t.title,
      'task',
      t.id,
      v_rule_late.id,
      null
    from public.tasks t
    where t.due_date < now()
      and t.status not in ('done', 'cancelled')
      and t.assignee_id is not null
    on conflict (source, source_id, user_id, rule_id) where source_id is not null do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  return json_build_object(
    'ok', true,
    'task_penalties_awarded', v_count
  );
end;
$$;

revoke all on function private.apply_overdue_task_penalties() from public, anon, authenticated;
grant execute on function private.apply_overdue_task_penalties() to service_role;

