-- =====================================================================
-- OPTIONAL: scheduled jobs (run manually after enabling pg_cron in the
-- Supabase dashboard: Database -> Extensions -> pg_cron).
-- Not part of migrations because the extension must be enabled first.
-- =====================================================================

-- 1) Mark late payments as overdue every day (04:00 UTC = 06:00/07:00 Cairo)
select cron.schedule(
  'mark-overdue-payments', '0 4 * * *',
  $$ update public.payments
        set status = 'overdue'
      where status = 'pending' and due_date < current_date $$
);

-- 2) Keep the free-tier project awake (free projects pause after ~7 days of inactivity)
select cron.schedule('keep-awake', '0 */12 * * *', $$ select 1 $$);

-- 3) Payment / task reminders and weekly reports: call an Edge Function with pg_net
--    once the function exists. Example (store the key in Vault, never in plain SQL):
-- select cron.schedule('payment-reminders', '0 7 * * *', $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/payment-reminders',
--     headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_KEY_FROM_VAULT>')
--   ) $$);
