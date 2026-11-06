-- =====================================================================
-- Migration: 20261106093000_allow_application_deletion.sql
-- Description:
-- 1. Update applications_delete RLS policy to allow hr_admin, president,
--    and vice_president to delete applications.
-- 2. Provide public.delete_application(p_application_id uuid) RPC function
--    (SECURITY DEFINER) enforcing RBAC permissions.
-- 3. Explicit GRANTs to authenticated and service_role.
-- =====================================================================

-- 1. Drop previous delete policy
drop policy if exists applications_delete on public.applications;

-- 2. Create updated delete policy for HR admin & Leadership
create policy applications_delete on public.applications for delete to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])));

-- 3. Ensure authenticated users have table-level DELETE privilege
grant delete on public.applications to authenticated;

-- 4. Provide delete_application RPC function
create or replace function public.delete_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
begin
  -- 1. Verify caller authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'غير مصرح: يجب تسجيل الدخول للقيام بهذه العملية.');
  end if;

  -- 2. Verify caller role (HR Admin, President, VP, Super Admin)
  if not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: حذف طلبات التقديم مقتصر على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  -- 3. Delete the application
  delete from public.applications
  where id = p_application_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'طلب التقديم غير موجود أو تم حذفه مسبقاً.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'تم حذف طلب التقديم بنجاح.'
  );
end;
$$;

grant execute on function public.delete_application(uuid) to authenticated, service_role;

