-- =====================================================================
-- Migration: 20261108072000_fix_delete_member_point_entries_purge.sql
-- Description:
--   Allow authorized member deletion by letting private.point_entries_immutable()
--   bypass immutability checks when running inside an explicit admin purge transaction
--   (flagged via session configuration 'app.purge_member_data' = 'true').
--
--   Root cause:
--     When deleting a member (public.delete_member), Postgres cascades deletion
--     of public.profiles -> public.point_entries, and sets null on given_by/voided_by.
--     The row-level trigger point_entries_guard unconditionally blocked all DELETE
--     and UPDATE actions with: "Point entries cannot be deleted; void them instead".
--
--   Solution:
--     1. Update private.point_entries_immutable() so that if the transaction-local
--        setting 'app.purge_member_data' is 'true', the trigger permits the purge/cascade.
--        Outside of this administrative purge, point entries remain strictly append-only
--        and immutable.
--     2. Update public.delete_member(p_user_id) to set 'app.purge_member_data' = 'true'
--        locally for the transaction, explicitly clean up point disputes and entries,
--        and cleanly delete the member profile and auth user.
-- =====================================================================

-- 1. Update private.point_entries_immutable to permit purge when app.purge_member_data = 'true'
create or replace function private.point_entries_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
begin
  -- 0. Administrative purge bypass: allow cascade/purge delete and foreign-key updates
  -- during authorized member deletion without violating append-only rules for normal use.
  if current_setting('app.purge_member_data', true) = 'true' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

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


-- 2. Update public.delete_member(p_user_id) RPC
create or replace function public.delete_member(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id   uuid;
  v_member_code text;
  v_member_name text;
begin
  -- 1. Check authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error',
      'غير مصرح: يجب تسجيل الدخول للقيام بهذه العملية.');
  end if;

  -- 2. Verify caller role (Super Admin, President, VP, HR Admin)
  if not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error',
      'صلاحيات غير كافية: حذف الأعضاء مقتصر على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  -- 3. Prevent self-deletion
  if v_caller_id = p_user_id then
    return jsonb_build_object('ok', false, 'error',
      'لا يمكنك حذف حسابك الشخصي من لوحة التحكم.');
  end if;

  -- 4. Check if member exists and get their code & name
  select member_code, coalesce(full_name_ar, full_name_en, 'العضو')
  into v_member_code, v_member_name
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error',
      'العضو المستهدف غير موجود أو تم حذفه مسبقاً.');
  end if;

  -- 5. Enable purge bypass for this local transaction only.
  -- This allows point entries and cascade operations to proceed smoothly
  -- without altering DDL or dropping triggers.
  perform set_config('app.purge_member_data', 'true', true);

  -- 6. Cleanly unlink any recruitment applications that converted into this user
  update public.applications
  set converted_user_id = null,
      status = 'new',
      updated_at = now()
  where converted_user_id = p_user_id;

  -- 7. Explicitly purge point disputes, point entries, and scores for the member
  delete from public.point_disputes where user_id = p_user_id;
  delete from public.point_entries  where user_id = p_user_id;
  delete from public.member_scores  where user_id = p_user_id;

  -- 8. Delete memberships, user_roles, profile_private
  delete from public.memberships     where user_id = p_user_id;
  delete from public.user_roles      where user_id = p_user_id;
  delete from public.profile_private where user_id = p_user_id;

  -- 9. Delete from profiles (which frees the member_code for code recycling)
  delete from public.profiles where id = p_user_id;

  -- 10. Delete from auth.users & auth.identities (best-effort)
  begin
    delete from auth.identities where user_id = p_user_id;
    delete from auth.users     where id       = p_user_id;
  exception when others then
    null;
  end;

  -- 11. Audit notification for caller
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_caller_id,
      'member_deleted',
      'تم حذف عضو وتحرير كود العضوية',
      'تم حذف العضو ' || v_member_name || ' نهائياً، وأصبح كود العضوية '
        || coalesce(v_member_code, '') || ' متاحاً للاستخدام من جديد.',
      jsonb_build_object(
        'deleted_user_id', p_user_id,
        'member_code',     v_member_code
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok',         true,
    'memberCode', v_member_code,
    'message',    'تم حذف العضو نهائياً وتحرير كود العضوية بنجاح.'
  );
end;
$$;

-- Explicit grants
grant execute on function public.delete_member(uuid) to authenticated, service_role;

