-- =====================================================================
-- Migration: 20261109163000_auto_convert_application_on_accept_trigger.sql
-- Description:
--   Automatic Instant Member Conversion & Login Activation on Application Acceptance:
--   1. Automatically fires whenever an application is marked as 'accepted'
--      (from Dashboard, API, or direct update).
--   2. Provisions GoTrue auth account with 14-digit National ID as password,
--      assigns 7-digit member code (e.g. 2026008), creates profile & memberships,
--      and confirms email immediately.
--   3. Converts any existing accepted applications and the test applicant immediately.
-- =====================================================================

create or replace function public.trg_auto_convert_accepted_application()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  -- Prevent recursive trigger loops
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  -- Fire only when application status is 'accepted' and user has not been converted yet
  if NEW.status = 'accepted' and (
    TG_OP = 'INSERT' 
    or OLD.status is distinct from 'accepted' 
    or NEW.converted_user_id is null
  ) then
    perform public.convert_application_to_member(NEW.id, null, 'member');
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_auto_convert_application on public.applications;

create trigger trg_auto_convert_application
  after insert or update of status on public.applications
  for each row
  when (NEW.status = 'accepted')
  execute function public.trg_auto_convert_accepted_application();


-- =====================================================================
-- Instant Execution: Convert all existing accepted applications & test applicant
-- =====================================================================
do $$
declare
  r record;
begin
  -- 1. Convert all existing applications that have status = 'accepted' but missing converted_user_id
  for r in (
    select id from public.applications
    where status = 'accepted' and converted_user_id is null
  ) loop
    perform public.convert_application_to_member(r.id, null, 'member');
  end loop;

  -- 2. Convert the test applicant automatically so they can log in immediately
  for r in (
    select id from public.applications
    where email = 'test_fake_applicant_99@enactusqena.org' and converted_user_id is null
  ) loop
    perform public.convert_application_to_member(r.id, 'presentation', 'member');
  end loop;
end;
$$;

-- Run master credentials sync to ensure everything is confirmed and GoTrue tokens are set
select public.sync_member_auth_credentials(null);
