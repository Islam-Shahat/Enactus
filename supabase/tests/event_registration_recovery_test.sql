-- =====================================================================
-- Test: Event Registration Security & Ticket Recovery Proof Verification
-- Path: supabase/tests/event_registration_recovery_test.sql
-- 
-- Verifies that:
-- 1. Initial registration returns a new ticket_code.
-- 2. An unverified caller (p_verify_proof = false or 4-arg overload)
--    CANNOT retrieve an existing attendee's ticket_code (returns null).
-- 3. A verified caller (p_verify_proof = true) safely receives the
--    existing attendee's ticket_code.
-- 4. Duplicate registrations do not create duplicate records.
--
-- Safe to run in Supabase SQL editor or local psql: runs in a transaction
-- and ALWAYS executes rollback at the end.
-- =====================================================================

begin;

create temp table if not exists registration_test_results (
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
  insert into registration_test_results (test_name, expected, actual, status)
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
  v_event_id uuid := gen_random_uuid();
  v_season_id uuid := gen_random_uuid();
  v_res_new jsonb;
  v_res_unverified jsonb;
  v_res_verified jsonb;
  v_res_legacy jsonb;
  v_original_ticket text;
  v_reg_count int;
begin
  -- 1. Create Season & Event fixture
  insert into public.seasons (id, name, start_date, end_date, is_active)
  values (v_season_id, 'Test Season 2026/2027', '2026-09-01', '2027-06-30', true);

  insert into public.events (
    id, slug, title_ar, title_en, description_ar, venue_ar,
    starts_at, ends_at, capacity, registration_open, status
  ) values (
    v_event_id,
    'security-test-summit',
    'قمة الأمان الرقمي',
    'Digital Security Summit',
    'فعالية تدريبية لاختبار أمان التسجيل',
    'قاعة المؤتمرات - قنا',
    now() + interval '5 days',
    now() + interval '5 days 4 hours',
    100,
    true,
    'published'
  );

  -- 2. Initial Registration for attendee
  v_res_new := private.register_for_event(
    p_event_id => v_event_id,
    p_full_name => 'أحمد علي حسن',
    p_email => 'Ahmed.Ali@example.com',
    p_phone => '01011112222',
    p_verify_proof => false
  );

  v_original_ticket := v_res_new->>'ticket_code';

  perform pg_temp.record_result(
    'Initial registration returns is_existing: false',
    'false',
    (v_res_new->>'is_existing')::text
  );

  perform pg_temp.record_result(
    'Initial registration returns non-null ticket_code starting with ENQ-',
    'true',
    (v_original_ticket like 'ENQ-%')::text
  );

  perform pg_temp.record_result(
    'Initial registration status is registered',
    'registered',
    v_res_new->>'status'
  );

  -- 3. Unverified Duplicate Registration (Attacker / Public lookup knowing only email)
  v_res_unverified := private.register_for_event(
    p_event_id => v_event_id,
    p_full_name => 'أحمد علي حسن',
    p_email => 'ahmed.ali@example.com',
    p_phone => '01011112222',
    p_verify_proof => false
  );

  perform pg_temp.record_result(
    'Unverified duplicate registration detects is_existing: true',
    'true',
    (v_res_unverified->>'is_existing')::text
  );

  perform pg_temp.record_result(
    'SECURITY: Unverified duplicate registration HIDES ticket_code (returns NULL)',
    'null',
    coalesce(v_res_unverified->>'ticket_code', 'null')
  );

  -- 4. Verified Duplicate Registration (Attendee proved ownership via email recovery token)
  v_res_verified := private.register_for_event(
    p_event_id => v_event_id,
    p_full_name => 'أحمد علي حسن',
    p_email => 'ahmed.ali@example.com',
    p_phone => '01011112222',
    p_verify_proof => true
  );

  perform pg_temp.record_result(
    'Verified duplicate registration detects is_existing: true',
    'true',
    (v_res_verified->>'is_existing')::text
  );

  perform pg_temp.record_result(
    'Verified duplicate registration RECOVERS exact original ticket_code',
    v_original_ticket,
    coalesce(v_res_verified->>'ticket_code', '')
  );

  -- 5. Backward-Compatible 4-argument overload defaults to unverified (safe by default)
  v_res_legacy := private.register_for_event(
    v_event_id,
    'أحمد علي حسن',
    'ahmed.ali@example.com',
    '01011112222'
  );

  perform pg_temp.record_result(
    '4-argument overload defaults to unverified: ticket_code is NULL',
    'null',
    coalesce(v_res_legacy->>'ticket_code', 'null')
  );

  -- 6. Verify table row integrity: strictly one registration row was created
  select count(*) into v_reg_count
  from public.event_registrations
  where event_id = v_event_id and lower(email) = 'ahmed.ali@example.com';

  perform pg_temp.record_result(
    'Total registration rows for this email remain exactly 1 (idempotent)',
    '1',
    v_reg_count::text
  );
end;
$$;

-- Display test results
select id, test_name, expected, actual, status
from registration_test_results
order by id;

rollback;

