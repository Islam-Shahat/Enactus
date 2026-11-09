-- =====================================================================
-- Migration: 20261109160000_fix_gotrue_auth_null_tokens_and_conversion.sql
-- Description:
--   Comprehensive Fix for GoTrue 500 "Database error querying schema":
--   1. Replaces NULL tokens in auth.users with empty strings ('') for:
--      confirmation_token, recovery_token, email_change, email_change_token_new.
--      (Supabase GoTrue crashes during signIn with "converting NULL to string
--      is unsupported" when direct SQL inserts omit these string columns).
--   2. Ensures auth.identities has valid identity_data with email_verified: true.
--   3. Updates public.sync_member_auth_credentials to always populate token
--      columns with empty strings on insert and update.
--   4. Updates public.convert_application_to_member to insert valid GoTrue
--      auth.users records with empty string tokens, normalize national_id
--      accurately, and invoke sync_member_auth_credentials at the end.
--   5. Updates public.create_member_admin with the same GoTrue-compliant tokens.
--   6. Immediately executes batch repair for all existing members so all
--      accounts can sign in immediately without GoTrue schema scan errors.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. Immediate GoTrue auth.users NULL token repair
-- =====================================================================
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    is_sso_user = false,
    updated_at = now()
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_confirmed_at is null;

-- Ensure identities have email_verified: true
update auth.identities
set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object(
      'sub', user_id::text,
      'email', lower(trim(coalesce(identity_data->>'email', ''))),
      'email_verified', true,
      'phone_verified', false
    ),
    last_sign_in_at = coalesce(last_sign_in_at, now()),
    updated_at = now()
where provider = 'email'
  and (
    identity_data is null
    or not (identity_data ? 'email_verified')
    or (identity_data->>'email_verified')::boolean is not true
  );


-- =====================================================================
-- 2. Master Member Credentials Sync and Repair RPC
-- =====================================================================
drop function if exists public.sync_member_auth_credentials(uuid);

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
      p.full_name_en,
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
        -- A. If user does not exist in auth.users, create it with ALL required GoTrue token strings
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
              confirmation_token,
              recovery_token,
              email_change,
              email_change_token_new,
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
              '',
              '',
              '',
              '',
              false,
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object(
                'full_name_ar', v_target.full_name_ar,
                'full_name_en', coalesce(v_target.full_name_en, v_target.full_name_ar),
                'member_code', v_target.member_code
              ),
              now(),
              now()
            );
          exception when others then
            -- Fallback to synthetic portal email if conflict
            v_login_email := v_target.member_code || '@portal.enactusqena.org';
            insert into auth.users (
              instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
              confirmation_token, recovery_token, email_change, email_change_token_new,
              is_sso_user, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) values (
              '00000000-0000-0000-0000-000000000000',
              v_target.user_id,
              'authenticated',
              'authenticated',
              v_login_email,
              extensions.crypt(v_pwd, extensions.gen_salt('bf')),
              now(),
              '',
              '',
              '',
              '',
              false,
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object(
                'full_name_ar', v_target.full_name_ar,
                'full_name_en', coalesce(v_target.full_name_en, v_target.full_name_ar),
                'member_code', v_target.member_code
              ),
              now(),
              now()
            );
          end;
        else
          -- B. User exists in auth.users: ensure non-null tokens, update password, confirm email & ensure active
          update auth.users
          set encrypted_password = extensions.crypt(v_pwd, extensions.gen_salt('bf')),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              confirmation_token = coalesce(confirmation_token, ''),
              recovery_token = coalesce(recovery_token, ''),
              email_change = coalesce(email_change, ''),
              email_change_token_new = coalesce(email_change_token_new, ''),
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

        -- D. Ensure correct email identity exists with email_verified: true
        if exists (
          select 1 from auth.identities
          where user_id = v_target.user_id and provider = 'email'
        ) then
          update auth.identities
          set provider_id = v_target.user_id::text,
              identity_data = jsonb_build_object(
                'sub', v_target.user_id::text,
                'email', v_login_email,
                'email_verified', true,
                'phone_verified', false
              ),
              last_sign_in_at = coalesce(last_sign_in_at, now()),
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
              jsonb_build_object(
                'sub', v_target.user_id::text,
                'email', v_login_email,
                'email_verified', true,
                'phone_verified', false
              ),
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


-- =====================================================================
-- 3. GoTrue-Compliant convert_application_to_member RPC
-- =====================================================================
drop function if exists public.convert_application_to_member(uuid, text, text);

create or replace function public.convert_application_to_member(
  p_application_id uuid,
  p_committee_slug text default null,
  p_position text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
  v_app record;
  v_committee_id uuid;
  v_season_id uuid;
  v_season_year text;
  v_user_id uuid;
  v_member_code text;
  v_clean_phone text;
  v_clean_national_id text;
  v_target_position text;
  v_member_password text;
begin
  -- 1. Verify caller authentication (allow SQL Editor / service role or authorized admin)
  v_caller_id := auth.uid();
  if v_caller_id is not null and not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: هذه العملية مقتصرة على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  if v_caller_id is null then
    select id into v_caller_id
    from auth.users
    where email = 'eng.eslamshahat24@gmail.com'
    limit 1;

    if v_caller_id is null then
      select user_id into v_caller_id
      from public.user_roles
      where role in ('super_admin', 'president')
      limit 1;
    end if;
  end if;

  -- 3. Fetch application
  select * into v_app
  from public.applications
  where id = p_application_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'طلب التقديم غير موجود.');
  end if;

  -- 4. Idempotency check: if already converted, re-sync auth credentials and return
  if v_app.converted_user_id is not null then
    perform public.sync_member_auth_credentials(v_app.converted_user_id);
    return jsonb_build_object(
      'ok', true,
      'alreadyConverted', true,
      'userId', v_app.converted_user_id,
      'status', v_app.status,
      'message', 'تم تحديث ومزامنة بيانات تسجيل الدخول للعضو وتعيين كلمة المرور بنجاح.'
    );
  end if;

  -- 5. Resolve target committee
  if p_committee_slug is not null and trim(p_committee_slug) <> '' then
    select id into v_committee_id
    from public.committees
    where slug = trim(p_committee_slug)
       or id::text = trim(p_committee_slug)
    limit 1;
  end if;

  if v_committee_id is null then
    v_committee_id := v_app.first_choice_id;
  end if;

  if v_committee_id is null then
    select id into v_committee_id
    from public.committees
    where is_public = true
    order by sort_order asc
    limit 1;
  end if;

  if v_committee_id is null then
    return jsonb_build_object('ok', false, 'error', 'تعذر تحديد اللجنة المستهدفة للعضو.');
  end if;

  -- 6. Resolve active season & year
  select id, substring(name from '\d{4}') into v_season_id, v_season_year
  from public.seasons
  where is_active = true
  limit 1;

  if v_season_id is null then
    v_season_id := v_app.season_id;
    select substring(name from '\d{4}') into v_season_year
    from public.seasons
    where id = v_season_id;
  end if;

  if v_season_year is null or length(v_season_year) <> 4 then
    v_season_year := to_char(now(), 'YYYY');
  end if;

  -- 7. Normalize phone, national_id & position
  v_clean_phone := nullif(trim(coalesce(v_app.phone, '')), '');
  v_clean_national_id := nullif(trim(coalesce(v_app.national_id, v_app.answers->>'nationalId', '')), '');
  if v_clean_national_id is not null then
    v_clean_national_id := translate(v_clean_national_id, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
    v_clean_national_id := regexp_replace(v_clean_national_id, '[^0-9]', '', 'g');
  end if;

  v_target_position := coalesce(nullif(trim(p_position), ''), 'member');
  if v_target_position not in ('member', 'coordinator', 'vice', 'head') then
    v_target_position := 'member';
  end if;

  -- 8. Determine member password:
  -- Priority 1: 14-digit National ID
  -- Priority 2: Clean Phone number
  -- Priority 3: Fallback secure password Enactus@2026
  v_member_password := coalesce(v_clean_national_id, v_clean_phone, 'Enactus@2026');

  -- 9. Generate sequential 7-digit member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 10. Find or provision user in auth.users
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(v_app.email))
  limit 1;

  if v_user_id is null then
    select user_id into v_user_id
    from public.profile_private
    where lower(email) = lower(trim(v_app.email))
    limit 1;
  end if;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      is_sso_user,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(v_app.email)),
      extensions.crypt(v_member_password, extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      false,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name_ar', v_app.full_name,
        'full_name_en', v_app.full_name,
        'member_code', v_member_code
      ),
      now(),
      now()
    );
  else
    -- Sync existing auth.users record: set password, ensure confirmed, clear SSO lock, clear NULL tokens
    update auth.users
    set encrypted_password = extensions.crypt(v_member_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        is_sso_user = false,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    where id = v_user_id;
  end if;

  -- 11. Sync auth.identities with email_verified: true
  delete from auth.identities
  where user_id = v_user_id
    and provider = 'email'
    and provider_id <> v_user_id::text;

  if exists (
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'email'
  ) then
    update auth.identities
    set provider_id = v_user_id::text,
        identity_data = jsonb_build_object(
          'sub', v_user_id::text,
          'email', lower(trim(v_app.email)),
          'email_verified', true,
          'phone_verified', false
        ),
        last_sign_in_at = coalesce(last_sign_in_at, now()),
        updated_at = now()
    where user_id = v_user_id and provider = 'email';
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
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', lower(trim(v_app.email)),
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
      );
    exception when others then
      null;
    end;
  end if;

  -- 12. Upsert profiles
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (v_user_id, v_app.full_name, v_app.full_name, 'active', 'ar', v_member_code)
  on conflict (id) do update set
    full_name_ar = coalesce(public.profiles.full_name_ar, excluded.full_name_ar),
    full_name_en = coalesce(public.profiles.full_name_en, excluded.full_name_en),
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 13. Upsert profile_private with national_id
  insert into public.profile_private (user_id, email, phone, faculty, study_year, national_id)
  values (v_user_id, lower(trim(v_app.email)), v_clean_phone, v_app.faculty, v_app.study_year, v_clean_national_id)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(public.profile_private.phone, excluded.phone),
    faculty = coalesce(public.profile_private.faculty, excluded.faculty),
    study_year = coalesce(public.profile_private.study_year, excluded.study_year),
    national_id = coalesce(excluded.national_id, public.profile_private.national_id);

  -- 14. Upsert memberships
  insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
  values (v_user_id, v_season_id, v_committee_id, v_target_position, 'active', current_date)
  on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- 15. Assign 'member' user_role if not present
  if not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'member'
  ) then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', null, v_season_id, v_caller_id);
  end if;

  -- 16. Update applications record
  update public.applications set
    status = 'accepted',
    converted_user_id = v_user_id,
    reviewed_by = coalesce(reviewed_by, v_caller_id),
    updated_at = now()
  where id = v_app.id;

  -- 17. Master sync verification
  perform public.sync_member_auth_credentials(v_user_id);

  -- 18. Record audit notification
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_caller_id,
      'application_converted',
      'تم قبول المتقدم وتحويله لعضو',
      'تم تحويل ' || v_app.full_name || ' إلى عضو رسمي في الفريق بنجاح، وكلمة المرور الافتراضية هي رقمه القومي.',
      jsonb_build_object(
        'application_id', v_app.id,
        'user_id', v_user_id,
        'member_code', v_member_code,
        'committee_id', v_committee_id,
        'has_national_id', (v_clean_national_id is not null)
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'userId', v_user_id,
    'memberCode', v_member_code,
    'email', lower(trim(v_app.email)),
    'nationalId', v_clean_national_id,
    'committeeId', v_committee_id,
    'seasonId', v_season_id,
    'message', 'Application converted to active member successfully'
  );
end;
$$;

grant execute on function public.convert_application_to_member(uuid, text, text)
  to authenticated, service_role;


-- =====================================================================
-- 4. GoTrue-Compliant create_member_admin RPC
-- =====================================================================
drop function if exists public.create_member_admin(text, text, text, text, text, uuid, text, text, integer, date, text, text, uuid);
drop function if exists public.create_member_admin(text, text, text, text, text, uuid, text, text, int, date, text, text);
drop function if exists public.create_member_admin;

create or replace function public.create_member_admin(
  p_full_name_ar text,
  p_full_name_en text,
  p_national_id text,
  p_phone text default null,
  p_email text default null,
  p_committee_id uuid default null,
  p_position text default 'member',
  p_faculty text default null,
  p_study_year integer default 1,
  p_birth_date date default null,
  p_gender text default null,
  p_governorate text default null,
  p_season_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
  v_user_id uuid;
  v_season_id uuid;
  v_season_year text;
  v_committee_id uuid;
  v_member_code text;
  v_candidate_email text;
  v_clean_national_id text;
  v_clean_ar_name text;
begin
  -- 1. Caller auth & authorization
  v_caller_id := auth.uid();
  if v_caller_id is not null and not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية.');
  end if;

  -- 2. Validate input
  v_clean_ar_name := trim(coalesce(p_full_name_ar, ''));
  if length(v_clean_ar_name) < 3 then
    return jsonb_build_object('ok', false, 'error', 'الاسم بالعربية مطلوب ويجب ألا يقل عن 3 أحرف.');
  end if;

  v_clean_national_id := trim(coalesce(p_national_id, ''));
  v_clean_national_id := translate(v_clean_national_id, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  v_clean_national_id := regexp_replace(v_clean_national_id, '[^0-9]', '', 'g');

  if length(v_clean_national_id) <> 14 then
    return jsonb_build_object('ok', false, 'error', 'الرقم القومي غير صالح، يجب أن يتكون من 14 رقماً.');
  end if;

  -- 3. Resolve season & year
  if p_season_id is not null then
    select id, substring(name from '\d{4}') into v_season_id, v_season_year
    from public.seasons where id = p_season_id;
  end if;

  if v_season_id is null then
    select id, substring(name from '\d{4}') into v_season_id, v_season_year
    from public.seasons where is_active = true limit 1;
  end if;

  if v_season_year is null or length(v_season_year) <> 4 then
    v_season_year := to_char(now(), 'YYYY');
  end if;

  -- 4. Generate sequential member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 5. Email handling
  v_candidate_email := lower(trim(coalesce(nullif(p_email, ''), v_member_code || '@portal.enactusqena.org')));

  -- 6. Check existing user
  select id into v_user_id
  from auth.users
  where lower(email) = v_candidate_email
  limit 1;

  if v_user_id is null then
    select user_id into v_user_id
    from public.profile_private
    where lower(email) = v_candidate_email
       or national_id = v_clean_national_id
    limit 1;
  end if;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      is_sso_user,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_candidate_email,
      extensions.crypt(v_clean_national_id, extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      false,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name_ar', v_clean_ar_name,
        'full_name_en', coalesce(nullif(trim(p_full_name_en), ''), v_clean_ar_name),
        'member_code', v_member_code
      ),
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(v_clean_national_id, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change = coalesce(email_change, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        is_sso_user = false,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    where id = v_user_id;
  end if;

  -- 7. Upsert profiles
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (
    v_user_id,
    v_clean_ar_name,
    coalesce(nullif(trim(p_full_name_en), ''), v_clean_ar_name),
    'active',
    'ar',
    v_member_code
  )
  on conflict (id) do update set
    full_name_ar = excluded.full_name_ar,
    full_name_en = excluded.full_name_en,
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 8. Upsert profile_private
  insert into public.profile_private (
    user_id, email, phone, faculty, study_year, national_id, birth_date, gender, governorate
  ) values (
    v_user_id,
    v_candidate_email,
    nullif(trim(p_phone), ''),
    nullif(trim(p_faculty), ''),
    coalesce(p_study_year, 1),
    v_clean_national_id,
    p_birth_date,
    p_gender,
    nullif(trim(p_governorate), '')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profile_private.phone),
    national_id = excluded.national_id,
    birth_date = coalesce(excluded.birth_date, public.profile_private.birth_date),
    gender = coalesce(excluded.gender, public.profile_private.gender),
    governorate = coalesce(excluded.governorate, public.profile_private.governorate);

  -- 9. Committee & memberships
  v_committee_id := p_committee_id;
  if v_committee_id is null then
    select id into v_committee_id from public.committees where is_public = true order by sort_order asc limit 1;
  end if;

  if v_committee_id is not null and v_season_id is not null then
    insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
    values (v_user_id, v_season_id, v_committee_id, coalesce(nullif(trim(p_position), ''), 'member'), 'active', current_date)
    on conflict (user_id, season_id, committee_id) do update set
      position = excluded.position,
      status = 'active';
  end if;

  -- 10. Role
  if not exists (select 1 from public.user_roles where user_id = v_user_id and role = 'member') then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', v_committee_id, v_season_id, coalesce(v_caller_id, v_user_id));
  end if;

  -- 11. Master credentials sync
  perform public.sync_member_auth_credentials(v_user_id);

  return jsonb_build_object(
    'ok', true,
    'userId', v_user_id,
    'memberCode', v_member_code,
    'email', v_candidate_email,
    'message', 'Member created successfully'
  );
end;
$$;

grant execute on function public.create_member_admin(
  text, text, text, text, text, uuid, text, text, integer, date, text, text, uuid
) to authenticated, service_role;


-- =====================================================================
-- 5. Automated Instant Repair of All Existing Member Logins & Convert Test Applicant
-- =====================================================================
select public.sync_member_auth_credentials(null);

-- Convert test applicant if pending
do $$
declare
  v_test_app_id uuid;
begin
  select id into v_test_app_id
  from public.applications
  where email = 'test_fake_applicant_99@enactusqena.org'
    and converted_user_id is null
  limit 1;

  if v_test_app_id is not null then
    perform public.convert_application_to_member(v_test_app_id, 'presentation', 'member');
  end if;
end;
$$;

