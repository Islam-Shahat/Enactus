-- =====================================================================
-- Migration: 20261108073000_fix_all_member_auth_sync_and_login.sql
-- Description:
--   Comprehensive Member Authentication & Credentials Repair:
--   1. Ensures pgcrypto extension is active in extensions schema.
--   2. Updates public.get_member_login_email to prioritize actual auth.users.email
--      registered in the GoTrue authentication system, ensuring Supabase Auth
--      always receives the exact registered email during sign-in.
--   3. Updates public.sync_member_auth_credentials(p_user_id) to repair/create
--      missing auth.users rows, re-hash password to 14-digit National ID,
--      confirm email (email_confirmed_at = now()), and sync auth.identities.
--   4. Immediately executes the batch repair for all members (including 2026005)
--      so all existing members can log in immediately with their member code
--      and 14-digit National ID.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Resilient Login Email Resolver
create or replace function public.get_member_login_email(p_identifier text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions, auth
as $$
declare
  v_clean text;
  v_email text;
begin
  if p_identifier is null then
    return null;
  end if;

  -- Trim whitespace and normalize Arabic-Indic digits (٠-٩) and Persian digits (۰-۹)
  v_clean := lower(trim(p_identifier));
  v_clean := translate(v_clean, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  v_clean := replace(v_clean, ' ', '');

  if v_clean = '' then
    return null;
  end if;

  -- A. Direct email pattern
  if v_clean like '%@%.%' then
    return v_clean;
  end if;

  -- B. Check 7-digit sequential member_code (e.g. 2026005)
  -- Priority 1: Check what email exists in auth.users for this profile!
  select lower(trim(au.email))
  into v_email
  from public.profiles p
  join auth.users au on au.id = p.id
  where lower(trim(coalesce(p.member_code, ''))) = v_clean
    and au.email is not null
    and trim(au.email) <> ''
  limit 1;

  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- Priority 2: Check profile_private email
  select lower(trim(pp.email))
  into v_email
  from public.profiles p
  join public.profile_private pp on pp.user_id = p.id
  where lower(trim(coalesce(p.member_code, ''))) = v_clean
    and pp.email is not null
    and trim(pp.email) <> ''
  limit 1;

  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- Priority 3: Check if auth user exists with synthetic portal alias
  if exists (
    select 1 from auth.users where lower(email) = v_clean || '@portal.enactusqena.org'
  ) then
    return v_clean || '@portal.enactusqena.org';
  end if;

  -- C. Check 14-digit National ID (e.g. 30607292701777)
  if length(v_clean) = 14 and v_clean ~ '^\d{14}$' then
    -- Check auth.users email first
    select lower(trim(au.email))
    into v_email
    from public.profile_private pp
    join auth.users au on au.id = pp.user_id
    where replace(translate(trim(coalesce(pp.national_id, '')), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), ' ', '') = v_clean
      and au.email is not null
      and trim(au.email) <> ''
    limit 1;

    if v_email is not null and v_email <> '' then
      return v_email;
    end if;

    -- Check profile_private email
    select lower(trim(pp.email))
    into v_email
    from public.profile_private pp
    where replace(translate(trim(coalesce(pp.national_id, '')), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), ' ', '') = v_clean
      and pp.email is not null
      and trim(pp.email) <> ''
    limit 1;

    if v_email is not null and v_email <> '' then
      return v_email;
    end if;
  end if;

  -- D. Check phone number (e.g. 01557523934)
  if length(v_clean) >= 10 and v_clean ~ '^\d+$' then
    select lower(trim(coalesce(au.email, pp.email)))
    into v_email
    from public.profile_private pp
    left join auth.users au on au.id = pp.user_id
    where regexp_replace(coalesce(pp.phone, ''), '[^0-9]', '', 'g') = v_clean
    limit 1;

    if v_email is not null and v_email <> '' then
      return v_email;
    end if;
  end if;

  -- E. Default fallback for standard 7-digit code
  if length(v_clean) = 7 and v_clean ~ '^\d{7}$' then
    return v_clean || '@portal.enactusqena.org';
  end if;

  return null;
end;
$$;

revoke all on function public.get_member_login_email(text) from public;
grant execute on function public.get_member_login_email(text) to anon, authenticated, service_role;


-- 2. Master Member Credentials Sync and Repair RPC
create or replace function public.sync_member_auth_credentials(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
  v_target record;
  v_synced_count integer := 0;
begin
  -- 1. Caller authentication check (skip if called internally in SQL editor / postgres role)
  v_caller_id := auth.uid();
  if v_caller_id is not null and not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية.');
  end if;

  -- 2. Iterate through target member profile(s)
  for v_target in (
    select
      p.id as user_id,
      p.member_code,
      p.full_name_ar,
      pp.national_id,
      pp.phone,
      pp.email as private_email,
      au.id as auth_user_id,
      au.email as auth_email
    from public.profiles p
    left join public.profile_private pp on pp.user_id = p.id
    left join auth.users au on au.id = p.id
    where (p_user_id is null or p.id = p_user_id)
  ) loop
    declare
      v_pwd text;
      v_login_email text;
      v_is_super boolean;
    begin
      -- Protection: never overwrite passwords for leadership/super_admin accounts that don't have a national_id
      select exists(
        select 1 from public.user_roles
        where user_id = v_target.user_id and role in ('super_admin', 'president', 'vice_president')
      ) into v_is_super;

      if v_is_super and (v_target.national_id is null or trim(v_target.national_id) = '') then
        -- Retain custom admin password (e.g. 2026001)
        continue;
      end if;

      -- Normalize password: use 14-digit National ID, or phone, or Enactus@2026
      v_pwd := nullif(trim(coalesce(v_target.national_id, v_target.phone, 'Enactus@2026')), '');
      if v_pwd is not null then
        v_pwd := translate(v_pwd, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
        v_pwd := regexp_replace(v_pwd, '[^0-9]', '', 'g');
        if length(v_pwd) < 6 then
          v_pwd := 'Enactus@2026';
        end if;
      end if;

      -- Determine desired login email
      v_login_email := lower(trim(coalesce(
        v_target.auth_email,
        v_target.private_email,
        v_target.member_code || '@portal.enactusqena.org'
      )));

      if v_target.user_id is not null and v_pwd is not null and v_login_email is not null then
        -- A. If user does not exist in auth.users, create it
        if v_target.auth_user_id is null then
          begin
            insert into auth.users (
              instance_id,
              id,
              aud,
              role,
              email,
              encrypted_password,
              email_confirmed_at,
              is_sso_user,
              raw_app_meta_data,
              raw_user_meta_data,
              created_at,
              updated_at
            ) values (
              '00000000-0000-0000-0000-000000000000',
              v_target.user_id,
              'authenticated',
              'authenticated',
              v_login_email,
              extensions.crypt(v_pwd, extensions.gen_salt('bf')),
              now(),
              false,
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object(
                'full_name_ar', v_target.full_name_ar,
                'member_code', v_target.member_code
              ),
              now(),
              now()
            );
          exception when others then
            -- If email is in use by another id, update candidate to synthetic email
            v_login_email := v_target.member_code || '@portal.enactusqena.org';
            insert into auth.users (
              instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
              is_sso_user, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) values (
              '00000000-0000-0000-0000-000000000000',
              v_target.user_id,
              'authenticated',
              'authenticated',
              v_login_email,
              extensions.crypt(v_pwd, extensions.gen_salt('bf')),
              now(),
              false,
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object(
                'full_name_ar', v_target.full_name_ar,
                'member_code', v_target.member_code
              ),
              now(),
              now()
            );
          end;
        else
          -- B. User exists in auth.users: update password, confirm email & ensure active
          update auth.users
          set encrypted_password = extensions.crypt(v_pwd, extensions.gen_salt('bf')),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              is_sso_user = false,
              raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
              updated_at = now()
          where id = v_target.user_id;
        end if;

        -- C. Clean up any invalid or mismatched email identities
        delete from auth.identities
        where user_id = v_target.user_id
          and provider = 'email'
          and provider_id <> v_target.user_id::text;

        -- D. Ensure correct email identity exists
        if exists (
          select 1 from auth.identities
          where user_id = v_target.user_id and provider = 'email'
        ) then
          update auth.identities
          set provider_id = v_target.user_id::text,
              identity_data = jsonb_build_object('sub', v_target.user_id::text, 'email', v_login_email),
              last_sign_in_at = now(),
              updated_at = now()
          where user_id = v_target.user_id and provider = 'email';
        else
          begin
            insert into auth.identities (
              id,
              user_id,
              identity_data,
              provider,
              provider_id,
              last_sign_in_at,
              created_at,
              updated_at
            ) values (
              gen_random_uuid(),
              v_target.user_id,
              jsonb_build_object('sub', v_target.user_id::text, 'email', v_login_email),
              'email',
              v_target.user_id::text,
              now(),
              now(),
              now()
            );
          exception when others then
            null;
          end;
        end if;

        -- E. Sync profile_private email with actual auth email
        update public.profile_private
        set email = v_login_email
        where user_id = v_target.user_id
          and (email is null or email <> v_login_email);

        -- F. Ensure default 'member' role in user_roles
        if not exists (
          select 1 from public.user_roles where user_id = v_target.user_id
        ) then
          insert into public.user_roles (user_id, role, granted_by)
          values (v_target.user_id, 'member', v_target.user_id);
        end if;

        v_synced_count := v_synced_count + 1;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'syncedCount', v_synced_count,
    'message', 'تمت مزامنة بيانات الدخول وتأكيد كلمة المرور بالرقم القومي بنجاح لجميع الأعضاء.'
  );
end;
$$;

revoke all on function public.sync_member_auth_credentials(uuid) from anon;
grant execute on function public.sync_member_auth_credentials(uuid) to authenticated, service_role;


-- 3. Automated Instant Repair of All Existing Member Logins
select public.sync_member_auth_credentials(null);

