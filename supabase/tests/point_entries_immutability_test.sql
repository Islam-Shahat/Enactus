-- =====================================================================
-- Test: Point Entries Immutability & Ledger Voiding Security Audit
-- Path: supabase/tests/point_entries_immutability_test.sql
-- 
-- Verifies:
-- 1. Allowed voiding by authorized leadership roles (hr_admin, president).
-- 2. Audit trail retention in public.audit_logs upon voiding.
-- 3. Forbidden DELETE on point entries.
-- 4. Forbidden editing of core fields: committee_id, rule_id, value, etc.
-- 5. Forbidden tampering / re-editing of an already voided entry.
-- 6. Forbidden spoofing of voided_by actor.
-- 7. Forbidden voiding without a valid non-empty void_reason.
-- 8. Forbidden voiding by unauthorized roles (plain members).
--
-- Transactional & Safe: Runs in a transaction and ALWAYS rolls back at the end.
-- =====================================================================

begin;

create temp table if not exists immutability_test_results (
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
) returns void language plpgsql security definer as $$
begin
  insert into immutability_test_results (test_name, expected, actual, status)
  values (
    p_name,
    p_expected,
    p_actual,
    case when p_expected = p_actual then 'PASS' else 'FAIL' end
  );
end;
$$;

-- Helper to register test users in auth.users and public.profiles
create or replace function pg_temp.setup_user(
  p_id uuid,
  p_email text,
  p_role text
) returns void language plpgsql security definer as $$
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values (p_id, 'authenticated', 'authenticated', p_email, jsonb_build_object('full_name_ar', 'مستخدم اختبار'))
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name_ar, full_name_en)
  values (p_id, 'مستخدم اختبار', 'Test User')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (p_id, p_role)
  on conflict do nothing;
end;
$$;

do $$
declare
  v_season_id uuid;
  v_comm_a uuid := gen_random_uuid();
  v_comm_b uuid := gen_random_uuid();
  v_rule_a uuid := gen_random_uuid();
  v_rule_b uuid := gen_random_uuid();

  v_u_member uuid := gen_random_uuid();
  v_u_hr uuid := gen_random_uuid();
  v_u_president uuid := gen_random_uuid();

  v_entry_valid uuid := gen_random_uuid();
  v_entry_for_delete uuid := gen_random_uuid();
  v_entry_for_comm_tamper uuid := gen_random_uuid();
  v_entry_for_rule_tamper uuid := gen_random_uuid();
  v_entry_for_spoof uuid := gen_random_uuid();
  v_entry_for_empty_reason uuid := gen_random_uuid();
  v_entry_member_unauth uuid := gen_random_uuid();

  v_err_msg text;
  v_audit_count int;
  v_row_count int;
begin
  -- 1. Fixture: Active Season
  select id into v_season_id from public.seasons where is_active limit 1;
  if v_season_id is null then
    v_season_id := gen_random_uuid();
    insert into public.seasons (id, name, starts_on, ends_on, is_active)
    values (v_season_id, 'Test Season 2026/2027', current_date - interval '30 days', current_date + interval '300 days', true);
  end if;

  -- 2. Fixture: Committees
  insert into public.committees (id, slug, name_ar, name_en)
  values (v_comm_a, 'comm-test-a', 'لجنة أ', 'Committee A')
  on conflict (slug) do update set name_ar = excluded.name_ar
  returning id into v_comm_a;

  insert into public.committees (id, slug, name_ar, name_en)
  values (v_comm_b, 'comm-test-b', 'لجنة ب', 'Committee B')
  on conflict (slug) do update set name_ar = excluded.name_ar
  returning id into v_comm_b;

  -- 3. Fixture: Point Rules
  insert into public.point_rules (id, season_id, code, type, default_value, description)
  values
    (v_rule_a, v_season_id, 'RULE_TEST_A', 'penalty', 5, 'Rule A'),
    (v_rule_b, v_season_id, 'RULE_TEST_B', 'penalty', 10, 'Rule B');

  -- 4. Fixture: Users
  perform pg_temp.setup_user(v_u_member, 'member_' || substr(v_u_member::text, 1, 8) || '@test.local', 'member');
  perform pg_temp.setup_user(v_u_hr, 'hr_' || substr(v_u_hr::text, 1, 8) || '@test.local', 'hr_admin');
  perform pg_temp.setup_user(v_u_president, 'pres_' || substr(v_u_president::text, 1, 8) || '@test.local', 'president');

  -- 5. Fixture: Seed Point Entries
  insert into public.point_entries (id, user_id, season_id, committee_id, rule_id, type, value, reason, given_by)
  values
    (v_entry_valid, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Original penalty', v_u_hr),
    (v_entry_for_delete, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty to delete', v_u_hr),
    (v_entry_for_comm_tamper, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty comm tamper', v_u_hr),
    (v_entry_for_rule_tamper, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty rule tamper', v_u_hr),
    (v_entry_for_spoof, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty spoof test', v_u_hr),
    (v_entry_for_empty_reason, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty empty reason test', v_u_hr),
    (v_entry_member_unauth, v_u_member, v_season_id, v_comm_a, v_rule_a, 'penalty', 5, 'Penalty member unauth test', v_u_hr);

  -- -------------------------------------------------------------------
  -- TEST 1: Allowed legitimate voiding by hr_admin
  -- -------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_u_hr::text, true);

  update public.point_entries
  set voided_at = now(),
      voided_by = v_u_hr,
      void_reason = 'Dispute accepted: excused medical absence'
  where id = v_entry_valid;
  get diagnostics v_row_count = row_count;

  perform pg_temp.record_result(
    'Allowed voiding by hr_admin successfully updates 1 row',
    '1',
    v_row_count::text
  );

  -- Verify audit trail in public.audit_logs
  select count(*) into v_audit_count
  from public.audit_logs
  where table_name = 'point_entries'
    and row_id = v_entry_valid::text
    and action = 'UPDATE';

  perform pg_temp.record_result(
    'Audit trail logged the legitimate void update in public.audit_logs',
    'true',
    (v_audit_count >= 1)::text
  );

  -- -------------------------------------------------------------------
  -- TEST 2: Forbidden DELETE on point_entries
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    delete from public.point_entries where id = v_entry_for_delete;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden DELETE is blocked with immutability error',
    'true',
    (v_err_msg like '%cannot be deleted%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 3: Forbidden unauthorized edit of committee_id
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    update public.point_entries
    set committee_id = v_comm_b
    where id = v_entry_for_comm_tamper;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden edit of committee_id is blocked',
    'true',
    (v_err_msg like '%permission denied%' or v_err_msg like '%core fields%' or v_err_msg like '%append-only%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 4: Forbidden unauthorized edit of rule_id
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    update public.point_entries
    set rule_id = v_rule_b
    where id = v_entry_for_rule_tamper;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden edit of rule_id is blocked',
    'true',
    (v_err_msg like '%permission denied%' or v_err_msg like '%core fields%' or v_err_msg like '%append-only%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 5: Forbidden tampering on an already voided entry
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    update public.point_entries
    set void_reason = 'Rewritten void reason'
    where id = v_entry_valid;
    get diagnostics v_row_count = row_count;
    if v_row_count = 0 then
      v_err_msg := 'RLS blocked update on already-voided row';
    end if;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden edit on already-voided entry is rejected by RLS or trigger',
    'true',
    (v_err_msg like '%already voided%' or v_err_msg like '%RLS blocked%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 6: Forbidden spoofing of voided_by actor
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    -- Authenticated caller is v_u_hr, but attempts to claim president voided it
    update public.point_entries
    set voided_at = now(),
        voided_by = v_u_president,
        void_reason = 'Spoofed actor test'
    where id = v_entry_for_spoof;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden spoofing of voided_by is rejected',
    'true',
    (v_err_msg like '%Unauthorized to record void on behalf of another user%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 7: Forbidden voiding without a reason
  -- -------------------------------------------------------------------
  v_err_msg := 'no error';
  begin
    update public.point_entries
    set voided_at = now(),
        voided_by = v_u_hr,
        void_reason = '   '
    where id = v_entry_for_empty_reason;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden voiding with empty reason is rejected',
    'true',
    (v_err_msg like '%non-empty void_reason is required%')::text
  );

  -- -------------------------------------------------------------------
  -- TEST 8: Forbidden voiding by unauthorized role (Plain member)
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_u_member::text, true);

  v_err_msg := 'no error';
  begin
    update public.point_entries
    set voided_at = now(),
        voided_by = v_u_member,
        void_reason = 'Member attempting self-void'
    where id = v_entry_member_unauth;
    get diagnostics v_row_count = row_count;
    if v_row_count = 0 then
      v_err_msg := 'RLS blocked unauthorized member voiding';
    end if;
  exception when others then
    v_err_msg := sqlerrm;
  end;

  perform pg_temp.record_result(
    'Forbidden voiding by plain member is blocked by RLS',
    'true',
    (v_err_msg like '%RLS blocked%' or v_err_msg like '%permission denied%')::text
  );

end $$;

-- Reset role
reset role;

-- Print summary
select id, test_name, expected, actual, status
from immutability_test_results
order by id;

-- Verification check: fail with non-zero SQL error if any recorded result is FAIL
do $$
declare
  v_fail_count int;
  v_fail_summary text;
begin
  select count(*),
         string_agg(format('[%s]: expected %s, got %s', test_name, expected, actual), E'\n  ')
  into v_fail_count, v_fail_summary
  from immutability_test_results
  where status = 'FAIL';

  if v_fail_count > 0 then
    raise exception 'Point Entries Immutability Test FAILED with % failure(s):%  %', v_fail_count, E'\n', v_fail_summary;
  end if;

  raise notice 'Point Entries Immutability Test PASSED: all checks succeeded.';
end $$;

rollback;

