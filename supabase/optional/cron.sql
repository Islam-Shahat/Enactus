-- =====================================================================
-- OPTIONAL: scheduled jobs (run manually after enabling extensions in the
-- Supabase dashboard: Database -> Extensions).
--
-- Required extensions:
-- 1. pg_cron: Job scheduler inside PostgreSQL
-- 2. pg_net: Asynchronous HTTP request client for Edge Functions
-- 3. vault: Encrypted secrets management
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Routine database jobs (run directly via SQL)
-- ---------------------------------------------------------------------

-- 1a) Mark late payments as overdue every day (04:00 UTC = 06:00/07:00 Cairo)
select cron.schedule(
  'mark-overdue-payments',
  '0 4 * * *',
  $$ update public.payments
        set status = 'overdue'
      where status = 'pending' and due_date < current_date $$
);

-- 1b) Keep the free-tier project awake (free projects pause after ~7 days of inactivity)
select cron.schedule(
  'keep-awake',
  '0 */12 * * *',
  $$ select 1 $$
);

-- ---------------------------------------------------------------------
-- 2. Secure Secret Storage via Supabase Vault
-- ---------------------------------------------------------------------
-- SECURITY NOTE: NEVER store the service_role key or plain-text secrets in
-- SQL migration files, git commits, or client-side code.
--
-- Run these once in the Supabase SQL Editor (replace placeholders with actual values):
--
-- select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
-- select vault.create_secret('<CRON_SECRET_VALUE>', 'cron_secret');
--
-- Note: CRON_SECRET must also be configured in Edge Function secrets:
-- supabase secrets set CRON_SECRET="<CRON_SECRET_VALUE>"

-- ---------------------------------------------------------------------
-- 3. Weekly Operations Report Edge Function Trigger
-- ---------------------------------------------------------------------
-- Invoked every Thursday at 06:00 UTC (08:00 AM Cairo time)
-- Uses pg_net to invoke the weekly-report Edge Function.
-- Dynamically decrypts the project URL and CRON_SECRET from Supabase Vault.
-- Does NOT expose the service-role key or secret in plain text.

do $$
begin
  -- Unschedule existing job if already registered to ensure clean idempotency
  begin
    perform cron.unschedule('weekly-operations-report');
  exception when others then null;
  end;

  -- Schedule HTTP POST invocation
  perform cron.schedule(
    'weekly-operations-report',
    '0 6 * * 4', -- Thursday 06:00 UTC
    $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'scheduled', true,
        'triggered_at', now()
      )
    ) as request_id;
    $cron$
  );
exception when others then
  raise notice 'pg_cron / pg_net / vault setup deferred: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 4. Verification & Diagnostics Queries
-- ---------------------------------------------------------------------
-- Check registered cron jobs:
--   select * from cron.job;
--
-- Check recent job run logs in public.job_runs:
--   select * from public.job_runs where job = 'weekly_report' order by created_at desc limit 10;
--
-- Check pg_net HTTP responses:
--   select * from net._http_response order by created desc limit 5;
