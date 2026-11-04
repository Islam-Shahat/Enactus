-- =====================================================================
-- Phase 9: Points, Leaderboard, Dispute Resolution & Automatic Penalties
-- Migration: 20261104003000_phase9_points.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Seed standard point rules if not already present
-- ---------------------------------------------------------------------
insert into public.point_rules (code, name_ar, name_en, type, value, is_auto, active, description)
values
  ('absence_unexcused', 'غياب غير معذور عن جلسة', 'Unexcused Absence from Session', 'penalty', 20, true, true, 'خصم تلقائي عند إغلاق جلسة الحضور وتسجيل غياب غير معذور'),
  ('late_arrival', 'تأخير عن موعد جلسة الحضور', 'Late Arrival to Session', 'penalty', 10, true, true, 'خصم تلقائي عند تسجيل الحضور بعد بدء الجلسة بـ 15 دقيقة'),
  ('task_late', 'تأخر في تسليم المهمة', 'Overdue Task Submission', 'penalty', 10, true, true, 'خصم تلقائي عند تجاوز الموعد النهائي للمهمة دون إنجاز'),
  ('task_early', 'تسليم المهمة مبكراً بجودة عالية', 'Early Task Completion', 'bonus', 10, false, true, 'مكافأة تمنح عند إنهاء المهمة قبل موعدها'),
  ('outstanding_work', 'أداء استثنائي ومبادرة متميزة', 'Outstanding Work & Initiative', 'bonus', 20, false, true, 'مكافأة يمنحها مسؤولو الفريق واللجان للجهود المتميزة')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 2. Unique partial index for idempotent penalty insertions
-- ---------------------------------------------------------------------
-- Ensures that an automatic penalty for a specific source record and rule
-- can only be awarded/deducted once per user.
create unique index if not exists point_entries_source_source_id_user_rule_idx
  on public.point_entries (source, source_id, user_id, rule_id)
  where source_id is not null;

-- ---------------------------------------------------------------------
-- 3. Replace point_disputes_insert policy with strict 48-hour window
-- ---------------------------------------------------------------------
-- A member can dispute only their own active point entry within 48 hours of creation.
drop policy if exists point_disputes_insert on public.point_disputes;
create policy point_disputes_insert on public.point_disputes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.point_entries e
      where e.id = point_entry_id
        and e.user_id = (select auth.uid())
        and e.voided_at is null
        and e.created_at >= (now() - interval '48 hours')
    )
  );

-- ---------------------------------------------------------------------
-- 4. Atomic dispute resolution function (SECURITY INVOKER)
-- ---------------------------------------------------------------------
-- Executable by authenticated leadership (hr_admin, president, vice_president, super_admin).
-- If accepted, atomically voids the point entry and updates the dispute.
-- If rejected, records the response and updates status to rejected.
create or replace function public.resolve_point_dispute(
  p_dispute uuid,
  p_accept boolean,
  p_response text
)
returns json
language plpgsql
security invoker
as $$
declare
  v_dispute public.point_disputes;
  v_caller uuid := (select auth.uid());
  v_is_authorized boolean;
  v_void_reason text;
begin
  -- Verify caller permissions
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_caller
      and (ur.role in ('hr_admin', 'president', 'vice_president', 'super_admin'))
  ) into v_is_authorized;

  if not v_is_authorized then
    raise exception 'Unauthorized to resolve point disputes' using errcode = '42501';
  end if;

  -- Lock dispute row for update
  select * into v_dispute
  from public.point_disputes
  where id = p_dispute
  for update;

  if not found then
    raise exception 'Point dispute not found' using errcode = 'P0002';
  end if;

  if v_dispute.status <> 'pending' then
    raise exception 'Dispute has already been resolved' using errcode = '22000';
  end if;

  if p_accept then
    v_void_reason := coalesce('Dispute accepted: ' || nullif(trim(p_response), ''), 'Dispute accepted by leadership');

    -- Void the underlying point entry
    update public.point_entries
    set voided_at = now(),
        voided_by = v_caller,
        void_reason = v_void_reason
    where id = v_dispute.point_entry_id
      and voided_at is null;

    -- Update dispute status
    update public.point_disputes
    set status = 'accepted',
        response = p_response,
        reviewed_by = v_caller,
        reviewed_at = now()
    where id = p_dispute;
  else
    -- Update dispute status as rejected
    update public.point_disputes
    set status = 'rejected',
        response = p_response,
        reviewed_by = v_caller,
        reviewed_at = now()
    where id = p_dispute;
  end if;

  return json_build_object(
    'ok', true,
    'dispute_id', p_dispute,
    'status', case when p_accept then 'accepted' else 'rejected' end
  );
end;
$$;

grant execute on function public.resolve_point_dispute(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Automatic Attendance Penalties (Private Function + Service-Role Wrapper)
-- ---------------------------------------------------------------------
-- For a CLOSED session, automatically generates penalties for 'absent' and 'late'
-- attendance records using active point_rules.
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
      on conflict (source, source_id, user_id, rule_id) do nothing
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
      on conflict (source, source_id, user_id, rule_id) do nothing
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

-- Revoke execution of private function from standard users
revoke all on function private.apply_attendance_penalties(uuid) from public, anon, authenticated;

-- Public RPC wrapper callable only by service_role (used by close-session Edge Function)
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
-- 6. Overdue Task Penalties (Private Function for Phase 15 Scheduling)
-- ---------------------------------------------------------------------
-- Automatically penalizes tasks past due date that are not done or cancelled.
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
    on conflict (source, source_id, user_id, rule_id) do nothing
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

