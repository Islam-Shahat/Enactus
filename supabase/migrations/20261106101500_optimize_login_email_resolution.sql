-- =====================================================================
-- Migration: 20261106101500_optimize_login_email_resolution.sql
-- Description:
-- 1. Ensure high-performance composite and expression indexes for member
--    code, national ID, and email lookups.
-- 2. Optimize public.get_member_login_email as STABLE SECURITY DEFINER with
--    sub-millisecond indexed execution, supporting member_code, national_id,
--    direct email, and auth.users email fallback for all current and future members.
-- 3. Explicit GRANT to anon, authenticated, service_role.
-- =====================================================================

create index if not exists idx_profiles_member_code_active
  on public.profiles (member_code)
  where member_code is not null;

create index if not exists idx_profile_private_national_id_clean
  on public.profile_private (national_id)
  where national_id is not null;

create index if not exists idx_profile_private_email_lower
  on public.profile_private (lower(email))
  where email is not null;

-- Ultra-fast stable resolver
create or replace function public.get_member_login_email(p_identifier text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_clean text;
  v_email text;
begin
  if p_identifier is null then
    return null;
  end if;

  v_clean := lower(trim(p_identifier));

  if v_clean = '' then
    return null;
  end if;

  -- 1. Direct email pattern
  if v_clean like '%@%.%' then
    return v_clean;
  end if;

  -- 2. Fast-path: Check 7-digit member_code (e.g. 2026001)
  select coalesce(pp.email, au.email)
  into v_email
  from public.profiles p
  left join public.profile_private pp on pp.user_id = p.id
  left join auth.users au on au.id = p.id
  where p.member_code = v_clean
  limit 1;

  if v_email is not null and v_email <> '' then
    return lower(trim(v_email));
  end if;

  -- 3. Fast-path: Check 14-digit national_id
  if length(v_clean) = 14 and v_clean ~ '^\d{14}$' then
    select coalesce(pp.email, au.email)
    into v_email
    from public.profile_private pp
    left join auth.users au on au.id = pp.user_id
    where pp.national_id = v_clean
    limit 1;

    if v_email is not null and v_email <> '' then
      return lower(trim(v_email));
    end if;
  end if;

  -- 4. Default synthetic email convention
  return v_clean || '@portal.enactusqena.org';
end;
$$;

revoke all on function public.get_member_login_email(text) from public;
grant execute on function public.get_member_login_email(text) to anon, authenticated, service_role;

