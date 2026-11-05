-- =====================================================================
-- Migration: 20261105091000_fix_payment_confirmation_status.sql
-- Fix payment-confirmation flow:
-- 1. Unify payment confirmation on canonical status 'paid'.
-- 2. Ensure payments table constraints require paid_at and confirmed_at
--    when a payment is marked paid/confirmed, while preserving confirmed_by.
-- 3. Update trg_notify_payment_confirmed() trigger so that confirming a payment
--    as 'paid' successfully generates notifications for PR officers and leadership.
-- 4. Normalization trigger ensuring audit fields are preserved and default timestamps populated.
-- =====================================================================

-- 1. Normalization trigger on public.payments:
-- Automatically populates paid_at, confirmed_at, confirmed_by, and normalizes status to 'paid'
create or replace function private.trg_payments_normalize_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- If payment is marked as paid or confirmed, ensure status is 'paid' and timestamps are set
  if new.status in ('paid', 'confirmed') then
    new.status := 'paid';
    new.paid_at := coalesce(new.paid_at, new.confirmed_at, now());
    new.confirmed_at := coalesce(new.confirmed_at, new.paid_at, now());
    if new.confirmed_by is null and (select auth.uid()) is not null then
      new.confirmed_by := (select auth.uid());
    end if;
  elsif new.confirmed_at is not null and new.status = 'pending' then
    new.status := 'paid';
    new.paid_at := coalesce(new.paid_at, new.confirmed_at, now());
    if new.confirmed_by is null and (select auth.uid()) is not null then
      new.confirmed_by := (select auth.uid());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payments_before_confirm on public.payments;
create trigger trg_payments_before_confirm
  before insert or update on public.payments
  for each row execute function private.trg_payments_normalize_confirmation();

-- 2. Update table check constraints on public.payments
alter table public.payments
  drop constraint if exists payments_status_check,
  drop constraint if exists payments_check,
  drop constraint if exists payments_paid_check,
  drop constraint if exists payments_paid_timestamps_check;

alter table public.payments
  add constraint payments_status_check
    check (status in ('pending', 'paid', 'confirmed', 'overdue', 'cancelled'));

alter table public.payments
  add constraint payments_paid_timestamps_check
    check (
      status not in ('paid', 'confirmed')
      or (paid_at is not null and confirmed_at is not null)
    );

-- 3. Replace agreement_balances view to handle canonical paid payments cleanly
create or replace view public.agreement_balances with (security_invoker = true) as
select a.id as agreement_id,
       a.company_id,
       a.total_value,
       coalesce(sum(p.amount) filter (where p.status in ('paid', 'confirmed')), 0)                      as paid_total,
       a.total_value - coalesce(sum(p.amount) filter (where p.status in ('paid', 'confirmed')), 0)      as remaining,
       coalesce(sum(p.amount) filter (where p.status = 'overdue'), 0)                                   as overdue_total
from public.agreements a
left join public.payments p on p.agreement_id = a.id
group by a.id, a.company_id, a.total_value;

-- 4. Replace trg_notify_payment_confirmed() to fire when status is 'paid' or confirmed_at is set
create or replace function private.trg_notify_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_is_confirmed boolean;
begin
  -- Row is now paid / confirmed
  v_is_confirmed := (new.status in ('paid', 'confirmed') or new.confirmed_at is not null);

  -- Only trigger on transition from unconfirmed to confirmed, or on insert of an already-confirmed payment
  if v_is_confirmed and (
    tg_op = 'INSERT'
    or old.status not in ('paid', 'confirmed')
    or old.confirmed_at is null
  ) then
    -- Notify the PR officer who recorded the payment + PR leadership + super_admin
    for v_recipient in (
      select distinct new.recorded_by as uid where new.recorded_by is not null
      union
      select distinct user_id as uid from public.user_roles where role in ('pr_admin', 'super_admin')
    ) loop
      perform private.create_notification(
        v_recipient,
        'payment_confirmed',
        'تم اعتماد الدفعة المالية بنجاح',
        'تم اعتماد دفعة بقيمة ' || new.amount || ' ج.م للمؤسسة.',
        '/dashboard/finance',
        jsonb_build_object(
          'payment_id', new.id,
          'agreement_id', new.agreement_id,
          'amount', new.amount,
          'confirmed_at', new.confirmed_at,
          'confirmed_by', new.confirmed_by
        ),
        'payment_confirmed:' || new.id || ':' || v_recipient
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payments_notify_confirmed on public.payments;
create trigger trg_payments_notify_confirmed
  after insert or update of status, confirmed_at, paid_at on public.payments
  for each row execute function private.trg_notify_payment_confirmed();

