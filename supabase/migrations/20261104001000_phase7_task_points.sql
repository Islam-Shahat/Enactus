-- =====================================================================
-- Phase 7: Tasks Points Trigger & Idempotent Partial Index
-- Migration: 20261104001000_phase7_task_points.sql
--
-- Why awarding points inside a database trigger is atomic and idempotent:
-- 1. ATOMICITY:
--    The task status transition (e.g. update to 'done') and the insertion into
--    point_entries execute within the exact same database transaction.
--    If the point insertion fails or constraint violation occurs, the entire
--    transaction rolls back, preventing inconsistent states where a task is
--    marked 'done' but points were not awarded (or vice versa).
--
-- 2. IDEMPOTENCY:
--    The unique partial index on (source, source_id, user_id) WHERE source = 'task'
--    AND rule_id IS NULL, paired with `ON CONFLICT (source, source_id, user_id) DO NOTHING`,
--    guarantees that points for a specific task completion can ONLY be awarded
--    once per assignee, even in the presence of concurrent requests, network retries,
--    or repeated status toggles between done/in_progress.
--
-- 3. SECURITY DEFINER with search_path = '':
--    Assignees only possess RLS permissions to update task status, but do NOT have
--    direct INSERT grants on point_entries. Executing with SECURITY DEFINER allows
--    the system to award the bonus points with elevated permissions while safely
--    shielding against search_path injection attacks by locking search_path to empty.
-- =====================================================================

-- 1. Unique partial index to ensure a user receives points for a given task only once
create unique index if not exists point_entries_task_unique_idx
  on public.point_entries (source, source_id, user_id)
  where source = 'task' and rule_id is null;

-- 2. Trigger function to award task completion points
create or replace function private.award_task_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only trigger when task transitions to 'done' from a different status,
  -- has points_value > 0, and has an assignee.
  if new.status = 'done'
     and (old.status is distinct from 'done')
     and new.points_value > 0
     and new.assignee_id is not null then

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
    values (
      new.assignee_id,
      new.season_id,
      new.committee_id,
      'bonus',
      new.points_value,
      concat('Task completed: ', new.title),
      'task',
      new.id,
      null,
      null
    )
    on conflict (source, source_id, user_id) where source = 'task' and rule_id is null
    do nothing;

  end if;

  return new;
end;
$$;

-- Disallow public and anon execution of internal private function
revoke all on function private.award_task_points() from public;
revoke all on function private.award_task_points() from anon;

-- 3. Bind after update trigger to public.tasks
drop trigger if exists tasks_award_points_trigger on public.tasks;
create trigger tasks_award_points_trigger
  after update on public.tasks
  for each row
  execute function private.award_task_points();

