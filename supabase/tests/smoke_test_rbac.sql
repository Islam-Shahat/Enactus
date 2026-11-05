-- =====================================================================
-- Phase 16: Automated RLS RBAC Smoke Test Suite
-- Path: supabase/tests/smoke_test_rbac.sql
-- 
-- Run in Supabase SQL Editor or via psql (local / dev only).
-- This script runs inside a transaction and ALWAYS rolls back at the end.
-- No database state is ever modified.
--
-- Fails with a non-zero SQL error if ANY recorded result is FAIL.
-- =====================================================================

begin;

-- Create helper logging table for test results
create temp table if not exists test_results (
  id serial primary key,
  role_name text not null,
  target_resource text not null,
  operation text not null,
  expected text not null,
  actual text not null,
  status text not null
);

create or replace function pg_temp.record_test(
  p_role text,
  p_resource text,
  p_op text,
  p_expected text,
  p_actual text
) returns void language plpgsql security definer as $$
begin
  insert into test_results (role_name, target_resource, operation, expected, actual, status)
  values (
    p_role,
    p_resource,
    p_op,
    p_expected,
    p_actual,
    case when p_expected = p_actual then 'PASS' else 'FAIL' end
  );
end;
$$;

-- Helper function to create auth user, profile, private profile, user role, and membership
create or replace function pg_temp.create_test_user(
  p_id uuid,
  p_email text,
  p_phone text,
  p_name_ar text,
  p_name_en text,
  p_role text,
  p_committee_id uuid default null,
  p_season_id uuid default null
) returns void language plpgsql security definer as $$
begin
  -- 1. Insert into auth.users (satisfies public.profiles.id FK references auth.users (id))
  insert into auth.users (
    id,
    aud,
    role,
    email,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    jsonb_build_object('full_name_ar', p_name_ar, 'full_name_en', p_name_en),
    now(),
    now()
  ) on conflict (id) do update set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data;

  -- 2. Insert or update public.profiles
  insert into public.profiles (id, full_name_ar, full_name_en)
  values (p_id, p_name_ar, p_name_en)
  on conflict (id) do update set
    full_name_ar = excluded.full_name_ar,
    full_name_en = excluded.full_name_en;

  -- 3. Insert or update public.profile_private
  insert into public.profile_private (user_id, email, phone)
  values (p_id, p_email, p_phone)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profile_private.phone);

  -- 4. Insert into public.user_roles
  insert into public.user_roles (user_id, role, committee_id)
  values (p_id, p_role, p_committee_id);

  -- 5. Insert active membership if committee and season are specified
  if p_committee_id is not null and p_season_id is not null then
    insert into public.memberships (user_id, season_id, committee_id, status)
    values (p_id, p_season_id, p_committee_id, 'active')
    on conflict (user_id, season_id, committee_id) do update set
      status = 'active';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. SETUP FIXTURES (Seasons, Committees, Users, Roles, Business Entities)
-- ---------------------------------------------------------------------
do $$
declare
  v_season_id uuid;
  v_comm_media uuid;
  v_comm_hr uuid;

  -- User IDs
  v_u_anon uuid := null;
  v_u_member uuid := gen_random_uuid();
  v_u_media_member uuid := gen_random_uuid();
  v_u_head uuid := gen_random_uuid();
  v_u_hr uuid := gen_random_uuid();
  v_u_pr uuid := gen_random_uuid();
  v_u_finance uuid := gen_random_uuid();
  v_u_media_admin uuid := gen_random_uuid();
  v_u_oc uuid := gen_random_uuid();
  v_u_president uuid := gen_random_uuid();
  v_u_vice uuid := gen_random_uuid();
  v_u_super uuid := gen_random_uuid();

  -- Resource IDs
  v_company_id uuid := gen_random_uuid();
  v_agreement_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();
  v_session_id uuid := gen_random_uuid();
  v_app_id uuid := gen_random_uuid();
  v_point_id uuid := gen_random_uuid();
  v_msg_id uuid := gen_random_uuid();

  v_count int;
begin
  -- 1. Ensure an active season exists
  select id into v_season_id from public.seasons where is_active limit 1;
  if v_season_id is null then
    v_season_id := gen_random_uuid();
    insert into public.seasons (id, name, starts_on, ends_on, is_active)
    values (v_season_id, 'Test Season 2026/2027', current_date - interval '30 days', current_date + interval '300 days', true);
  end if;

  -- 2. Ensure test committees exist (slug 'media' is required for private.in_committee_slug('media'))
  select id into v_comm_media from public.committees where slug = 'media' limit 1;
  if v_comm_media is null then
    v_comm_media := gen_random_uuid();
    insert into public.committees (id, slug, name_ar, name_en)
    values (v_comm_media, 'media', 'إعلام', 'Media');
  end if;

  select id into v_comm_hr from public.committees where slug = 'hr' limit 1;
  if v_comm_hr is null then
    v_comm_hr := gen_random_uuid();
    insert into public.committees (id, slug, name_ar, name_en)
    values (v_comm_hr, 'hr', 'موارد بشرية', 'Human Resources');
  end if;

  -- 3. Create test users with auth.users, profiles, private contact, roles and memberships
  -- (a) Plain Member in HR committee
  perform pg_temp.create_test_user(
    v_u_member,
    'smoke_member_' || substr(v_u_member::text, 1, 8) || '@test.local',
    '01000000001',
    'عضو عادي',
    'Plain Member',
    'member',
    v_comm_hr,
    v_season_id
  );

  -- (b) Media Team Member in Media committee
  perform pg_temp.create_test_user(
    v_u_media_member,
    'smoke_media_' || substr(v_u_media_member::text, 1, 8) || '@test.local',
    '01000000002',
    'عضو ميديا',
    'Media Member',
    'member',
    v_comm_media,
    v_season_id
  );

  -- (c) Committee Head of HR committee
  perform pg_temp.create_test_user(
    v_u_head,
    'smoke_head_' || substr(v_u_head::text, 1, 8) || '@test.local',
    '01000000003',
    'رئيس لجنة',
    'Committee Head',
    'committee_head',
    v_comm_hr,
    v_season_id
  );

  -- (d) HR Admin
  perform pg_temp.create_test_user(
    v_u_hr,
    'smoke_hr_' || substr(v_u_hr::text, 1, 8) || '@test.local',
    '01000000004',
    'مسؤول HR',
    'HR Admin',
    'hr_admin'
  );

  -- (e) PR Admin
  perform pg_temp.create_test_user(
    v_u_pr,
    'smoke_pr_' || substr(v_u_pr::text, 1, 8) || '@test.local',
    '01000000005',
    'مسؤول PR',
    'PR Admin',
    'pr_admin'
  );

  -- (f) Finance Admin
  perform pg_temp.create_test_user(
    v_u_finance,
    'smoke_fin_' || substr(v_u_finance::text, 1, 8) || '@test.local',
    '01000000006',
    'مسؤول مالية',
    'Finance Admin',
    'finance_admin'
  );

  -- (g) Media Admin
  perform pg_temp.create_test_user(
    v_u_media_admin,
    'smoke_medadm_' || substr(v_u_media_admin::text, 1, 8) || '@test.local',
    '01000000007',
    'مسؤول ميديا',
    'Media Admin',
    'media_admin'
  );

  -- (h) OC Admin
  perform pg_temp.create_test_user(
    v_u_oc,
    'smoke_oc_' || substr(v_u_oc::text, 1, 8) || '@test.local',
    '01000000008',
    'مسؤول تنظيم',
    'OC Admin',
    'oc_admin'
  );

  -- (i) President & Vice President
  perform pg_temp.create_test_user(
    v_u_president,
    'smoke_pres_' || substr(v_u_president::text, 1, 8) || '@test.local',
    '01000000009',
    'الرئيس',
    'President',
    'president'
  );

  perform pg_temp.create_test_user(
    v_u_vice,
    'smoke_vp_' || substr(v_u_vice::text, 1, 8) || '@test.local',
    '01000000010',
    'نائب الرئيس',
    'Vice President',
    'vice_president'
  );

  -- (j) Super Admin
  perform pg_temp.create_test_user(
    v_u_super,
    'smoke_super_' || substr(v_u_super::text, 1, 8) || '@test.local',
    '01000000011',
    'سوبر أدمن',
    'Super Admin',
    'super_admin'
  );

  -- 4. Insert Business Data Fixtures
  -- (a) Company: name_ar is required, valid stage 'signed'
  insert into public.companies (id, name_ar, name_en, stage, created_by)
  values (v_company_id, 'شركة تجريبية ذ.م.م', 'Test Company LLC', 'signed', v_u_pr);

  -- (b) Agreement: total_value numeric, status in ('draft','active','completed','cancelled')
  insert into public.agreements (id, company_id, season_id, title, total_value, status, created_by)
  values (v_agreement_id, v_company_id, v_season_id, 'اتفاقية رعاية تجريبية', 50000.00, 'active', v_u_pr);

  -- (c) Payment: status in ('pending','paid','overdue','cancelled')
  insert into public.payments (id, agreement_id, amount, status, recorded_by)
  values (v_payment_id, v_agreement_id, 25000.00, 'pending', v_u_pr);

  -- (d) Attendance Session & Secret
  insert into public.attendance_sessions (id, season_id, committee_id, title, starts_at, check_in_open, created_by)
  values (v_session_id, v_season_id, v_comm_hr, 'HR Workshop', now(), false, v_u_head);

  -- (e) Application: first_choice_id and second_choice_id reference committees
  insert into public.applications (
    id, season_id, full_name, email, phone, first_choice_id, second_choice_id, status
  ) values (
    v_app_id,
    v_season_id,
    'متقدم جديد',
    'applicant_' || substr(v_app_id::text, 1, 8) || '@test.local',
    '01111111111',
    v_comm_hr,
    v_comm_media,
    'new'
  );

  -- (f) Contact Message
  insert into public.contact_messages (id, full_name, email, message, status)
  values (v_msg_id, 'زائر للموقع', 'visitor@test.local', 'استفسار عن الشراكة', 'new');

  -- (g) Point Entry
  insert into public.point_entries (id, user_id, season_id, committee_id, type, value, reason, given_by)
  values (v_point_id, v_u_member, v_season_id, v_comm_hr, 'bonus', 5, 'مجهود متميز في الاجتماع', v_u_head);

  -- -------------------------------------------------------------------
  -- 2. TEST EXECUTION BLOCK PER ROLE
  -- -------------------------------------------------------------------

  -- 1. ROLE: anon
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('anon', 'payments', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('anon', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.profile_private;
  perform pg_temp.record_test('anon', 'profile_private', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.applications;
  perform pg_temp.record_test('anon', 'applications', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.point_entries;
  perform pg_temp.record_test('anon', 'point_entries', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.session_secrets;
  perform pg_temp.record_test('anon', 'session_secrets', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 2. ROLE: member
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_u_member::text, true);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('member', 'payments', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('member', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.profile_private where user_id = v_u_member;
  perform pg_temp.record_test('member', 'profile_private_own', 'SELECT', 'ALLOW', case when v_count = 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.profile_private where user_id = v_u_head;
  perform pg_temp.record_test('member', 'profile_private_other', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.point_entries where user_id = v_u_member;
  perform pg_temp.record_test('member', 'point_entries_own', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.session_secrets;
  perform pg_temp.record_test('member', 'session_secrets', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 3. ROLE: media-team member
  perform set_config('request.jwt.claim.sub', v_u_media_member::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('media-team member', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.companies;
  perform pg_temp.record_test('media-team member', 'companies', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  -- 4. ROLE: committee head
  perform set_config('request.jwt.claim.sub', v_u_head::text, true);

  select count(*) into v_count from public.applications where first_choice_id = v_comm_hr;
  perform pg_temp.record_test('committee head', 'applications_own_comm', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.profile_private where user_id = v_u_member;
  perform pg_temp.record_test('committee head', 'profile_private_member', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('committee head', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 5. ROLE: hr_admin
  perform set_config('request.jwt.claim.sub', v_u_hr::text, true);

  select count(*) into v_count from public.applications;
  perform pg_temp.record_test('hr_admin', 'applications', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.profile_private;
  perform pg_temp.record_test('hr_admin', 'profile_private_all', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('hr_admin', 'payments', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 6. ROLE: pr_admin
  perform set_config('request.jwt.claim.sub', v_u_pr::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('pr_admin', 'agreements', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('pr_admin', 'payments', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  -- pr_admin cannot update/confirm payments
  begin
    update public.payments set status = 'paid', paid_at = now() where id = v_payment_id;
    get diagnostics v_count = row_count;
    perform pg_temp.record_test('pr_admin', 'payments_confirm', 'UPDATE', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);
  exception when others then
    perform pg_temp.record_test('pr_admin', 'payments_confirm', 'UPDATE', 'DENY', 'DENY');
  end;

  -- 7. ROLE: finance_admin
  perform set_config('request.jwt.claim.sub', v_u_finance::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('finance_admin', 'agreements', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('finance_admin', 'payments', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  -- finance_admin CAN update/confirm payments
  update public.payments set status = 'paid', paid_at = now() where id = v_payment_id;
  get diagnostics v_count = row_count;
  perform pg_temp.record_test('finance_admin', 'payments_confirm', 'UPDATE', 'ALLOW', case when v_count = 1 then 'ALLOW' else 'DENY' end);

  -- 8. ROLE: media_admin
  perform set_config('request.jwt.claim.sub', v_u_media_admin::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('media_admin', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('media_admin', 'payments', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 9. ROLE: oc_admin
  perform set_config('request.jwt.claim.sub', v_u_oc::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('oc_admin', 'agreements', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('oc_admin', 'payments', 'SELECT', 'DENY', case when v_count = 0 then 'DENY' else 'ALLOW' end);

  -- 10. ROLE: president
  perform set_config('request.jwt.claim.sub', v_u_president::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('president', 'agreements', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('president', 'payments', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.applications;
  perform pg_temp.record_test('president', 'applications', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  -- 11. ROLE: vice_president
  perform set_config('request.jwt.claim.sub', v_u_vice::text, true);

  select count(*) into v_count from public.agreements;
  perform pg_temp.record_test('vice_president', 'agreements', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  select count(*) into v_count from public.payments;
  perform pg_temp.record_test('vice_president', 'payments', 'SELECT', 'ALLOW', case when v_count >= 1 then 'ALLOW' else 'DENY' end);

  -- 12. ROLE: super_admin
  perform set_config('request.jwt.claim.sub', v_u_super::text, true);

  delete from public.payments where id = v_payment_id;
  get diagnostics v_count = row_count;
  perform pg_temp.record_test('super_admin', 'payments_delete', 'DELETE', 'ALLOW', case when v_count = 1 then 'ALLOW' else 'DENY' end);

end $$;

-- ---------------------------------------------------------------------
-- 3. REPORTING & ENFORCEMENT
-- ---------------------------------------------------------------------

-- Reset role to postgres/default for evaluating and displaying results
reset role;

-- Output test results summary table
select
  role_name,
  target_resource,
  operation,
  expected,
  actual,
  status
from test_results
order by id;

-- Verification block: Fail with non-zero SQL error if any recorded result is FAIL
do $$
declare
  v_fail_count int;
  v_fail_summary text;
begin
  select count(*),
         string_agg(format('[%s] %s (%s): expected %s, got %s', role_name, target_resource, operation, expected, actual), E'\n  ')
  into v_fail_count, v_fail_summary
  from test_results
  where status = 'FAIL';

  if v_fail_count > 0 then
    raise exception 'RBAC smoke test FAILED with % failure(s):%  %', v_fail_count, E'\n', v_fail_summary;
  end if;

  raise notice 'RBAC smoke test PASSED: all % checks succeeded.', (select count(*) from test_results);
end $$;

-- Always rollback to guarantee no test data is committed
rollback;
