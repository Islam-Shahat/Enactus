-- =====================================================================
-- Migration: 20261105090000_point_entries_immutability_and_voiding.sql
-- Audit & hardening of point_entries ledger:
-- 1. Ledger immutability: point entries cannot be deleted or rewritten.
-- 2. Legitimate voiding: only authorized leadership roles can void an entry
--    using approved fields (voided_at, voided_by, void_reason).
-- 3. Field protection: prevent unauthorized changes to committee_id, rule_id,
--    value, reason, type, or spoofed voided_by.
-- 4. Audit trail: every voiding retains a full audit log in public.audit_logs.
-- =====================================================================

-- 1. Replace private.point_entries_immutable() with comprehensive immutability enforcement
create or replace function private.point_entries_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  -- 1. DELETE is unconditionally forbidden on the append-only ledger
  if tg_op = 'DELETE' then
    raise exception 'Point entries cannot be deleted; void them instead' using errcode = '42501';
  end if;

  -- 2. Once voided, an entry is permanently sealed; no edits or unvoiding are permitted
  if old.voided_at is not null then
    raise exception 'Point entry is already voided and immutable' using errcode = '22000';
  end if;

  -- 3. Only legitimate voiding transitions are allowed (old.voided_at IS NULL -> new.voided_at IS NOT NULL)
  if new.voided_at is null then
    raise exception 'Point entries are append-only; entries can only be voided' using errcode = '22000';
  end if;

  -- 4. Mandatory voiding attributes: non-empty reason and voided_by
  if new.void_reason is null or trim(new.void_reason) = '' then
    raise exception 'A non-empty void_reason is required to void a point entry' using errcode = '22000';
  end if;

  if new.voided_by is null then
    if v_caller is not null then
      new.voided_by := v_caller;
    else
      raise exception 'voided_by user is required' using errcode = '22000';
    end if;
  elsif v_caller is not null and new.voided_by <> v_caller then
    -- Prevent spoofing another user as the voiding actor
    raise exception 'Unauthorized to record void on behalf of another user' using errcode = '42501';
  end if;

  -- Guarantee voided_at is populated
  if new.voided_at is null then
    new.voided_at := now();
  end if;

  -- 5. Immutability guard on ALL core ledger fields:
  -- id, user_id, season_id, committee_id, type, value, reason, source, source_id, rule_id, given_by, created_at.
  -- Unauthorized rewriting of these fields is strictly prohibited.
  if (
    new.id,
    new.user_id,
    new.season_id,
    new.committee_id,
    new.type,
    new.value,
    new.reason,
    new.source,
    new.source_id,
    new.rule_id,
    new.given_by,
    new.created_at
  ) is distinct from (
    old.id,
    old.user_id,
    old.season_id,
    old.committee_id,
    old.type,
    old.value,
    old.reason,
    old.source,
    old.source_id,
    old.rule_id,
    old.given_by,
    old.created_at
  ) then
    raise exception 'Point entries are append-only; core fields (including committee_id and rule_id) cannot be edited'
      using errcode = '22000';
  end if;

  return new;
end;
$$;

-- Ensure trigger is active on public.point_entries
drop trigger if exists point_entries_guard on public.point_entries;
create trigger point_entries_guard
  before update or delete on public.point_entries
  for each row execute function private.point_entries_immutable();

-- 2. Ensure audit trigger is active on public.point_entries to preserve immutable audit trail
drop trigger if exists audit_point_entries on public.point_entries;
create trigger audit_point_entries
  after insert or update or delete on public.point_entries
  for each row execute function private.audit_row();

-- 3. Replace RLS policy for voiding point entries
drop policy if exists point_entries_void on public.point_entries;

create policy point_entries_void on public.point_entries
  for update to authenticated
  using (
    voided_at is null
    and (select private.can(array['hr_admin', 'president', 'vice_president']))
  )
  with check (
    voided_at is not null
    and (select private.can(array['hr_admin', 'president', 'vice_president']))
  );

-- 4. Column-level permissions: authenticated users can only update approved voiding columns
revoke update on public.point_entries from authenticated;
grant update (voided_at, voided_by, void_reason) on public.point_entries to authenticated;
revoke delete on public.point_entries from authenticated;

