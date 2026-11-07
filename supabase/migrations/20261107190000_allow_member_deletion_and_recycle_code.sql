-- =====================================================================
-- Migration: 20261107190000_allow_member_deletion_and_recycle_code.sql
-- Description:
-- 1. Create public.delete_member(p_user_id uuid) RPC function (SECURITY DEFINER)
--    allowing HR & Leadership to permanently delete a member from auth.users,
--    profiles, profile_private, memberships, and user_roles.
-- 2. Update public.generate_next_member_code to automatically scan for and
--    recycle any freed/unassigned sequence numbers (e.g. if 2026003 is deleted,
--    it becomes free and assigned to the next created member).
-- 3. Explicit GRANTs to authenticated and service_role.
-- =====================================================================

-- 1. Update generate_next_member_code to recycle freed sequence codes
create or replace function public.generate_next_member_code(p_season_year text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text;
  v_prefix text;
  v_free_seq integer;
  v_max_seq integer := 0;
  v_next_code text;
begin
  -- Deduce season year (e.g. 2026)
  if p_season_year is not null and length(trim(p_season_year)) = 4 then
    v_year := trim(p_season_year);
  else
    select substring(name from '\d{4}')
    into v_year
    from public.seasons
    where is_active = true
    limit 1;

    if v_year is null or length(v_year) <> 4 then
      v_year := to_char(now(), 'YYYY');
    end if;
  end if;

  v_prefix := v_year;

  -- Compute max existing 3-digit sequence
  select coalesce(max(nullif(substring(member_code from 5 for 3), '')::integer), 0)
  into v_max_seq
  from public.profiles
  where member_code like (v_prefix || '%')
    and length(member_code) = 7;

  -- Find the lowest available sequence number (reclaims freed gaps from deleted members)
  select s.seq
  into v_free_seq
  from generate_series(1, v_max_seq + 1) as s(seq)
  where not exists (
    select 1
    from public.profiles
    where member_code = v_prefix || lpad(s.seq::text, 3, '0')
  )
  order by s.seq asc
  limit 1;

  if v_free_seq is null then
    v_free_seq := v_max_seq + 1;
  end if;

  v_next_code := v_prefix || lpad(v_free_seq::text, 3, '0');
  return v_next_code;
end;
$$;

grant execute on function public.generate_next_member_code(text) to anon, authenticated, service_role;


-- 2. Provide delete_member RPC function
create or replace function public.delete_member(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
  v_member_code text;
  v_member_name text;
begin
  -- 1. Check authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'غير مصرح: يجب تسجيل الدخول للقيام بهذه العملية.');
  end if;

  -- 2. Verify caller role (Super Admin, President, VP, HR Admin)
  if not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: حذف الأعضاء مقتصر على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  -- 3. Prevent self-deletion
  if v_caller_id = p_user_id then
    return jsonb_build_object('ok', false, 'error', 'لا يمكنك حذف حسابك الشخصي من لوحة التحكم.');
  end if;

  -- 4. Check if member exists and get their code & name
  select member_code, coalesce(full_name_ar, full_name_en, 'العضو')
  into v_member_code, v_member_name
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'العضو المستهدف غير موجود أو تم حذفه مسبقاً.');
  end if;

  -- 5. Cleanly unlink any recruitment applications that converted into this user
  update public.applications
  set converted_user_id = null,
      status = 'new',
      updated_at = now()
  where converted_user_id = p_user_id;

  -- 6. Delete memberships, user_roles, profile_private
  delete from public.memberships where user_id = p_user_id;
  delete from public.user_roles where user_id = p_user_id;
  delete from public.profile_private where user_id = p_user_id;

  -- Delete from profiles (which frees the member_code from public.profiles!)
  delete from public.profiles where id = p_user_id;

  -- Delete from auth.users & auth.identities
  begin
    delete from auth.identities where user_id = p_user_id;
    delete from auth.users where id = p_user_id;
  exception when others then
    null;
  end;

  -- 7. Audit notification for caller
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_caller_id,
      'member_deleted',
      'تم حذف عضو وتحرير كود العضوية',
      'تم حذف العضو ' || v_member_name || ' نهائياً، وأصبح كود العضوية ' || coalesce(v_member_code, '') || ' متاحاً للاستخدام من جديد.',
      jsonb_build_object(
        'deleted_user_id', p_user_id,
        'member_code', v_member_code
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'memberCode', v_member_code,
    'message', 'تم حذف العضو نهائياً وتحرير كود العضوية بنجاح.'
  );
end;
$$;

grant execute on function public.delete_member(uuid) to authenticated, service_role;

-- 3. Table-level DELETE privileges for authenticated users
grant delete on public.memberships to authenticated;
grant delete on public.profiles to authenticated;
grant delete on public.profile_private to authenticated;

