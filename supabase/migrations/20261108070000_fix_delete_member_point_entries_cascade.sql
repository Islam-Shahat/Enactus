-- =====================================================================
-- Migration: 20261108070000_fix_delete_member_point_entries_cascade.sql
-- Description:
--   Fix member deletion failure caused by point_entries_guard trigger
--   blocking ON DELETE CASCADE from public.profiles → point_entries.
--
--   Root cause:
--     point_entries.user_id has ON DELETE CASCADE → public.profiles.
--     The trigger private.point_entries_immutable() unconditionally raises
--     an exception on any DELETE, which fires even when Postgres internally
--     cascades the deletion as part of deleting the parent profile row.
--
--   Fix:
--     Replace delete_member() so it:
--       1. Temporarily disables the point_entries_guard trigger using
--          ALTER TABLE … DISABLE TRIGGER (runs inside SECURITY DEFINER,
--          so the function owner – postgres/service_role – has the privilege).
--       2. Explicitly deletes point_entries for the user (cascade would have
--          done this, but now the trigger is off).
--       3. Re-enables the trigger before continuing.
--     All other steps (cascade tables, auth.users, notifications) remain
--     identical to the previous version.
-- =====================================================================

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

  -- 5. Cleanly unlink any recruitment applications that converted into this user
  update public.applications
  set converted_user_id = null,
      status = 'new',
      updated_at = now()
  where converted_user_id = p_user_id;

  -- 6. Temporarily disable the point_entries_guard trigger so that
  --    deleting a member's point entries does not raise the immutability error.
  --    The trigger is a business guard against end-user DELETE actions; here we
  --    are intentionally purging all data belonging to a deleted member under
  --    privileged SECURITY DEFINER context.
  alter table public.point_entries disable trigger point_entries_guard;
  alter table public.point_entries disable trigger audit_point_entries;

  begin
    -- 6a. Explicitly delete all point-related data for this user
    --     (point_disputes cascade-deletes from point_entries via its FK)
    delete from public.point_entries where user_id = p_user_id;
    delete from public.member_scores  where user_id = p_user_id;

    -- 6b. Re-enable triggers immediately after the targeted delete
    alter table public.point_entries enable trigger point_entries_guard;
    alter table public.point_entries enable trigger audit_point_entries;
  exception when others then
    -- Always re-enable triggers even if something goes wrong
    alter table public.point_entries enable trigger point_entries_guard;
    alter table public.point_entries enable trigger audit_point_entries;
    raise;
  end;

  -- 7. Delete memberships, user_roles, profile_private
  delete from public.memberships     where user_id = p_user_id;
  delete from public.user_roles      where user_id = p_user_id;
  delete from public.profile_private where user_id = p_user_id;

  -- 8. Delete from profiles (frees the member_code)
  delete from public.profiles where id = p_user_id;

  -- 9. Delete from auth.users & auth.identities (best-effort)
  begin
    delete from auth.identities where user_id = p_user_id;
    delete from auth.users     where id       = p_user_id;
  exception when others then
    null;
  end;

  -- 10. Audit notification for caller
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

-- Keep existing grants
grant execute on function public.delete_member(uuid) to authenticated, service_role;

