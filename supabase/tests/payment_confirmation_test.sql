-- =====================================================================
-- Test: Payment Confirmation Flow & Notification Trigger Verification
-- Path: supabase/tests/payment_confirmation_test.sql
-- 
-- Verifies:
-- 1. Recording a pending payment with a PR officer.
-- 2. Confirming the payment by Finance / Leadership:
--    - Updates status to canonical 'paid'.
--    - Populates and preserves paid_at, confirmed_at, confirmed_by.
-- 3. Payment-confirmed notification trigger:
--    - Dispatches notifications with type 'payment_confirmed' and link '/dashboard/finance'.
--    - Notifies the recording PR officer.
--    - Notifies PR admins / super admins.
-- 4. Agreement balance view recalculation (paid_total and remaining).
--
-- Transactional & Safe: Runs in a transaction and ALWAYS rolls back at the end.
-- =====================================================================

begin;

create temp table if not exists payment_test_results (
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
  insert into payment_test_results (test_name, expected, actual, status)
  values (
    p_name,
    p_expected,
    p_actual,
    case when p_expected = p_actual then 'PASS' else 'FAIL' end
  );
end;
$$;

-- Helper to setup user fixtures
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
  v_company_id uuid := gen_random_uuid();
  v_agreement_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();

  v_u_pr_recorder uuid := gen_random_uuid();
  v_u_pr_admin uuid := gen_random_uuid();
  v_u_finance uuid := gen_random_uuid();

  v_pay_row record;
  v_balance_row record;
  v_notif_count int;
  v_notif_pr_officer int;
  v_notif_pr_admin int;
  v_notif_type text;
  v_notif_link text;
begin
  -- 1. Setup Season
  select id into v_season_id from public.seasons where is_active limit 1;
  if v_season_id is null then
    v_season_id := gen_random_uuid();
    insert into public.seasons (id, name, starts_on, ends_on, is_active)
    values (v_season_id, 'Test Season 2026/2027', current_date - interval '30 days', current_date + interval '300 days', true);
  end if;

  -- 2. Setup Users
  perform pg_temp.setup_user(v_u_pr_recorder, 'pr_officer_' || substr(v_u_pr_recorder::text, 1, 8) || '@test.local', 'pr_admin');
  perform pg_temp.setup_user(v_u_pr_admin, 'pr_lead_' || substr(v_u_pr_admin::text, 1, 8) || '@test.local', 'pr_admin');
  perform pg_temp.setup_user(v_u_finance, 'finance_' || substr(v_u_finance::text, 1, 8) || '@test.local', 'finance_admin');

  -- 3. Setup Company & Agreement
  insert into public.companies (id, name_ar, name_en, stage, created_by)
  values (v_company_id, 'شركة الاختبارات المالية', 'Test Finance Co', 'signed', v_u_pr_recorder);

  insert into public.agreements (id, company_id, season_id, title, total_value, status, created_by)
  values (v_agreement_id, v_company_id, v_season_id, 'عقد رعاية تجريبي', 100000.00, 'active', v_u_pr_recorder);

  -- 4. Initial Step: PR Officer records a pending payment
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_u_pr_recorder::text, true);

  insert into public.payments (
    id, agreement_id, kind, amount, status, recorded_by, due_date
  ) values (
    v_payment_id, v_agreement_id, 'installment', 35000.00, 'pending', v_u_pr_recorder, current_date + interval '7 days'
  );

  select * into v_pay_row from public.payments where id = v_payment_id;

  perform pg_temp.record_result(
    'Initial payment recorded with status pending',
    'pending',
    v_pay_row.status
  );

  -- Initial agreement balance
  select * into v_balance_row from public.agreement_balances where agreement_id = v_agreement_id;

  perform pg_temp.record_result(
    'Initial paid_total is 0',
    '0.00',
    coalesce(v_balance_row.paid_total, 0)::numeric(12,2)::text
  );

  perform pg_temp.record_result(
    'Initial remaining balance equals total_value',
    '100000.00',
    coalesce(v_balance_row.remaining, 0)::numeric(12,2)::text
  );

  -- Verify no notifications exist yet for this payment
  select count(*) into v_notif_count
  from public.notifications
  where data->>'payment_id' = v_payment_id::text;

  perform pg_temp.record_result(
    'No notifications before confirmation',
    '0',
    v_notif_count::text
  );

  -- 5. Confirmation Step: Finance Admin confirms the payment (matching ConfirmPaymentDialog.jsx)
  perform set_config('request.jwt.claim.sub', v_u_finance::text, true);

  update public.payments
  set status = 'paid',
      paid_at = now(),
      method = 'bank_transfer',
      confirmed_by = v_u_finance,
      confirmed_at = now(),
      notes = 'Verified against bank receipt #TRX-9988'
  where id = v_payment_id;

  select * into v_pay_row from public.payments where id = v_payment_id;

  perform pg_temp.record_result(
    'Payment status confirmed as paid',
    'paid',
    v_pay_row.status
  );

  perform pg_temp.record_result(
    'paid_at timestamp is populated',
    'true',
    (v_pay_row.paid_at is not null)::text
  );

  perform pg_temp.record_result(
    'confirmed_at timestamp is populated',
    'true',
    (v_pay_row.confirmed_at is not null)::text
  );

  perform pg_temp.record_result(
    'confirmed_by matches finance admin',
    v_u_finance::text,
    v_pay_row.confirmed_by::text
  );

  -- 6. Verify agreement_balances view reflection
  select * into v_balance_row from public.agreement_balances where agreement_id = v_agreement_id;

  perform pg_temp.record_result(
    'Updated paid_total reflects 35000.00',
    '35000.00',
    v_balance_row.paid_total::numeric(12,2)::text
  );

  perform pg_temp.record_result(
    'Updated remaining balance reflects 65000.00',
    '65000.00',
    v_balance_row.remaining::numeric(12,2)::text
  );

  -- 7. Verify Notification Trigger dispatched payment_confirmed notifications
  select count(*) into v_notif_pr_officer
  from public.notifications
  where user_id = v_u_pr_recorder
    and data->>'payment_id' = v_payment_id::text
    and type = 'payment_confirmed';

  perform pg_temp.record_result(
    'Notification dispatched to recording PR officer',
    'true',
    (v_notif_pr_officer >= 1)::text
  );

  select count(*) into v_notif_pr_admin
  from public.notifications
  where user_id = v_u_pr_admin
    and data->>'payment_id' = v_payment_id::text
    and type = 'payment_confirmed';

  perform pg_temp.record_result(
    'Notification dispatched to PR leadership admin',
    'true',
    (v_notif_pr_admin >= 1)::text
  );

  select type, link into v_notif_type, v_notif_link
  from public.notifications
  where data->>'payment_id' = v_payment_id::text
  limit 1;

  perform pg_temp.record_result(
    'Notification type is payment_confirmed',
    'payment_confirmed',
    v_notif_type
  );

  perform pg_temp.record_result(
    'Notification link points to /dashboard/finance',
    '/dashboard/finance',
    v_notif_link
  );

end $$;

reset role;

-- Output results
select id, test_name, expected, actual, status
from payment_test_results
order by id;

-- Verification check: abort with non-zero SQL error if any test recorded FAIL
do $$
declare
  v_fail_count int;
  v_fail_summary text;
begin
  select count(*),
         string_agg(format('[%s]: expected %s, got %s', test_name, expected, actual), E'\n  ')
  into v_fail_count, v_fail_summary
  from payment_test_results
  where status = 'FAIL';

  if v_fail_count > 0 then
    raise exception 'Payment Confirmation Test FAILED with % failure(s):%  %', v_fail_count, E'\n', v_fail_summary;
  end if;

  raise notice 'Payment Confirmation Test PASSED: all checks succeeded.';
end $$;

rollback;

