-- =====================================================================
-- Test: Point Penalty Idempotency & ON CONFLICT Specification Verification
-- Path: supabase/tests/point_penalty_idempotency_test.sql
-- 
-- Run in Supabase SQL Editor or via psql (local / dev only).
-- This script runs inside a transaction and ALWAYS rolls back at the end.
-- No database state is ever modified.
-- =====================================================================

begin;

-- Temporary table to collect and display test outcomes
create temp table if not exists penalty_test_results (
  id serial primary key,
  test_name text not null,
  expected text not null,
  actual text not null,
  status text not null
);

create or replace function pg_temp.record_result(
  p_name text,
  p_expected text,
  p_actual text
) returns void language plpgsql as $$
begin
  insert into penalty_test_results (test_name, expected, actual, status)
  values (
    p_name,
    p_expected,
    p_actual,
    case when p_expected = p_actual then 'PASS' else 'FAIL' end
  );
end;
$$;

do $$
declare
  v_season_id uuid := gen_random_uuid();
  v_committee_id uuid := gen_random_uuid();
  v_user_absent uuid := gen_random_uuid();
  v_user_late uuid := gen_random_uuid();
  v_user_present uuid := gen_random_uuid();
  v_user_task uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_task_id uuid := gen_random_uuid();

  v_res_att1 json;
  v_res_att2 json;
  v_res_task1 json;
  v_res_task2 json;

  v_entry_count int;
begin
  -- 1. Create Season & Committee fixtures
  insert into public.seasons (id, name, start_date, end_date, is_active)
  values (v_season_id, 'Test Season 2026/2027', '2026-09-01', '2027-06-30', true);

  insert into public.committees (id, season_id, slug, name_ar, name_en)
  values (v_committee_id, v_season_id, 'test-pm-comm', 'لجنة الاختبار', 'Test Committee');

  -- 2. Create User Profiles
  insert into public.profiles (id, full_name, email, is_active)
  values
    (v_user_absent, 'عضو غائب', 'absent@enactusqena.org', true),
    (v_user_late, 'عضو متأخر', 'late@enactusqena.org', true),
    (v_user_present, 'عضو حاضر', 'present@enactusqena.org', true),
    (v_user_task, 'عضو مكلف بمهمة', 'taskuser@enactusqena.org', true);

  -- 3. Ensure Point Rules exist
  insert into public.point_rules (code, name_ar, name_en, type, value, is_auto, active, description)
  values
    ('absence_unexcused', 'غياب غير معذور', 'Unexcused Absence', 'penalty', 20, true, true, 'Test rule'),
    ('late_arrival', 'تأخير عن الحضور', 'Late Arrival', 'penalty', 10, true, true, 'Test rule'),
    ('task_late', 'تأخر في تسليم المهمة', 'Overdue Task', 'penalty', 10, true, true, 'Test rule')
  on conflict (code) do update
    set active = true;

  -- 4. Create Closed Attendance Session & Records
  insert into public.attendance_sessions (
    id, season_id, committee_id, title, session_date, check_in_open, created_by
  ) values (
    v_session_id, v_season_id, v_committee_id, 'ورشة العمل العامة', now(), false, v_user_absent
  );

  insert into public.attendance (session_id, user_id, status)
  values
    (v_session_id, v_user_absent, 'absent'),
    (v_session_id, v_user_late, 'late'),
    (v_session_id, v_user_present, 'present');

  -- 5. Create Overdue Task
  insert into public.tasks (
    id, season_id, committee_id, title, status, due_date, points_value, assignee_id, created_by
  ) values (
    v_task_id, v_season_id, v_committee_id, 'إعداد خطة المشروع التنموي', 'in_progress', now() - interval '2 days', 25, v_user_task, v_user_absent
  );

  -- ===================================================================
  -- TEST ATTENDANCE PENALTIES IDEMPOTENCY
  -- ===================================================================

  -- First Run: Must award 1 absent and 1 late penalty
  v_res_att1 := private.apply_attendance_penalties(v_session_id);

  perform pg_temp.record_result(
    'Attendance Penalties First Run: absent_penalties_awarded = 1',
    '1',
    coalesce(v_res_att1->>'absent_penalties_awarded', '0')
  );

  perform pg_temp.record_result(
    'Attendance Penalties First Run: late_penalties_awarded = 1',
    '1',
    coalesce(v_res_att1->>'late_penalties_awarded', '0')
  );

  -- Second Run (Immediately Following): ON CONFLICT DO NOTHING must skip existing entries
  v_res_att2 := private.apply_attendance_penalties(v_session_id);

  perform pg_temp.record_result(
    'Attendance Penalties Second Run (Idempotent): absent_penalties_awarded = 0',
    '0',
    coalesce(v_res_att2->>'absent_penalties_awarded', '-1')
  );

  perform pg_temp.record_result(
    'Attendance Penalties Second Run (Idempotent): late_penalties_awarded = 0',
    '0',
    coalesce(v_res_att2->>'late_penalties_awarded', '-1')
  );

  -- Total point entries for this session must equal exactly 2
  select count(*) into v_entry_count
  from public.point_entries
  where source = 'attendance' and source_id = v_session_id;

  perform pg_temp.record_result(
    'Attendance Penalties Total Stored Entries = 2 (No Duplicates)',
    '2',
    v_entry_count::text
  );

  -- ===================================================================
  -- TEST OVERDUE TASK PENALTIES IDEMPOTENCY
  -- ===================================================================

  -- First Run: Must award penalty for overdue task
  v_res_task1 := private.apply_overdue_task_penalties();

  select count(*) into v_entry_count
  from public.point_entries
  where source = 'task' and source_id = v_task_id;

  perform pg_temp.record_result(
    'Overdue Task Penalties First Run: Entry Created for Task',
    '1',
    v_entry_count::text
  );

  -- Second Run: Must not duplicate penalty for the same task
  v_res_task2 := private.apply_overdue_task_penalties();

  select count(*) into v_entry_count
  from public.point_entries
  where source = 'task' and source_id = v_task_id;

  perform pg_temp.record_result(
    'Overdue Task Penalties Second Run (Idempotent): Entry Count Remains 1',
    '1',
    v_entry_count::text
  );

  -- Public Wrapper Security Verification
  perform pg_temp.record_result(
    'Public apply_attendance_penalties Wrapper Executable',
    'true',
    (public.apply_attendance_penalties(v_session_id)->>'ok')::text
  );

end $$;

-- Output test results summary table
select
  id,
  test_name,
  expected,
  actual,
  status
from penalty_test_results
order by id;

rollback;

