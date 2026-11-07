-- supabase/migrations/20261107215000_fix_member_auth_login_and_sync.sql
-- =====================================================================
-- Migration: Fix Member Auth Login & Identity Credentials
-- 1. Ensure pgcrypto extension is active in extensions schema.
-- 2. Optimize public.get_member_login_email to resolve member_code, national_id,
--    phone, and email with Arabic/Eastern numeral normalization.
-- 3. Correct convert_application_to_member and create_member_admin RPCs:
--    - Set auth.users.email_confirmed_at = now() (confirmed_at is generated)
--    - Set auth.users.is_sso_user = false
--    - In auth.identities: ensure provider_id = user_id::text (NOT email string)
--    - Re-sync already converted applications when accepted again.
-- 4. Provide public.sync_member_auth_credentials(uuid) for on-demand
--    credential repair and password-sync to 14-digit National ID.
-- 5. Automated data repair for existing accepted members (such as 2026005).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. High-Performance Stable Login Email Resolver
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

  -- Trim whitespace and normalize Arabic-Indic digits (٠-٩) to standard digits (0-9)
  v_clean := lower(trim(p_identifier));
  v_clean := translate(v_clean, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  v_clean := replace(v_clean, ' ', '');

  if v_clean = '' then
    return null;
  end if;

  -- A. Direct email pattern
  if v_clean like '%@%.%' then
    return v_clean;
  end if;

  -- B. Check 7-digit sequential member_code (e.g. 2026005)
  select lower(trim(coalesce(pp.email, au.email)))
  into v_email
  from public.profiles p
  left join public.profile_private pp on pp.user_id = p.id
  left join auth.users au on au.id = p.id
  where lower(trim(coalesce(p.member_code, ''))) = v_clean
  limit 1;

  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- C. Check 14-digit National ID (e.g. 30607292701777)
  if length(v_clean) = 14 and v_clean ~ '^\d{14}$' then
    select lower(trim(coalesce(pp.email, au.email)))
    into v_email
    from public.profile_private pp
    left join auth.users au on au.id = pp.user_id
    where trim(coalesce(pp.national_id, '')) = v_clean
       or translate(trim(coalesce(pp.national_id, '')), '٠١٢٣٤٥٦٧٨٩', '0123456789') = v_clean
    limit 1;

    if v_email is not null and v_email <> '' then
      return v_email;
    end if;
  end if;

  -- D. Check phone number (e.g. 01557523934)
  if length(v_clean) >= 10 and v_clean ~ '^\d+$' then
    select lower(trim(coalesce(pp.email, au.email)))
    into v_email
    from public.profile_private pp
    left join auth.users au on au.id = pp.user_id
    where trim(coalesce(pp.phone, '')) = v_clean
       or regexp_replace(coalesce(pp.phone, ''), '[^0-9]', '', 'g') = v_clean
    limit 1;

    if v_email is not null and v_email <> '' then
      return v_email;
    end if;
  end if;

  -- E. Check if auth user exists with synthetic portal alias
  if exists (
    select 1 from auth.users where lower(email) = v_clean || '@portal.enactusqena.org'
  ) then
    return v_clean || '@portal.enactusqena.org';
  end if;

  -- Return null if no registered member matches this identifier
  return null;
end;
$$;

revoke all on function public.get_member_login_email(text) from public;
grant execute on function public.get_member_login_email(text) to anon, authenticated, service_role;


-- 2. Dedicated RPC to Sync and Repair Member Credentials to National ID
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
  -- 1. Caller authentication
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
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية.');
  end if;

  -- 3. Iterate through target member(s)
  for v_target in (
    select p.id as user_id, pp.national_id, pp.phone, pp.email as private_email, au.email as auth_email
    from public.profiles p
    left join public.profile_private pp on pp.user_id = p.id
    left join auth.users au on au.id = p.id
    where (p_user_id is null or p.id = p_user_id)
  ) loop
    declare
      v_pwd text;
      v_login_email text;
    begin
      v_pwd := nullif(trim(coalesce(v_target.national_id, v_target.phone, 'Enactus@2026')), '');
      if v_pwd is not null then
        v_pwd := translate(v_pwd, '٠١٢٣٤٥٦٧٨٩', '0123456789');
        v_pwd := replace(v_pwd, ' ', '');
      end if;

      v_login_email := lower(trim(coalesce(v_target.auth_email, v_target.private_email)));

      if v_target.user_id is not null and v_pwd is not null and v_login_email is not null then
        -- A. Update auth.users: password and email confirmation
        update auth.users
        set encrypted_password = extensions.crypt(v_pwd, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            is_sso_user = false,
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            updated_at = now()
        where id = v_target.user_id;

        -- B. Delete any invalid email identity with mismatched provider_id
        delete from auth.identities
        where user_id = v_target.user_id
          and provider = 'email'
          and provider_id <> v_target.user_id::text;

        -- C. Update or insert correct email identity
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

        v_synced_count := v_synced_count + 1;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'syncedCount', v_synced_count,
    'message', 'تمت مزامنة بيانات الدخول وتأكيد كلمة المرور بنجاح.'
  );
end;
$$;

grant execute on function public.sync_member_auth_credentials(uuid)
  to authenticated, service_role;


-- 3. Fixed convert_application_to_member RPC
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
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: هذه العملية مقتصرة على مسؤولي الموارد البشرية وإدارة الفريق.');
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
    v_clean_national_id := translate(v_clean_national_id, '٠١٢٣٤٥٦٧٨٩', '0123456789');
    v_clean_national_id := replace(v_clean_national_id, ' ', '');
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
    -- Sync existing auth.users record: set password, ensure confirmed, clear SSO lock
    update auth.users
    set encrypted_password = extensions.crypt(v_member_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        is_sso_user = false,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    where id = v_user_id;
  end if;

  -- 11. Sync auth.identities with provider_id = v_user_id::text
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
        identity_data = jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(v_app.email))),
        last_sign_in_at = now(),
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
        jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(v_app.email))),
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

  -- 17. Record audit / notification
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
    'committeeId', v_committee_id,
    'seasonId', v_season_id,
    'message', 'Application converted to active member successfully'
  );
end;
$$;

grant execute on function public.convert_application_to_member(uuid, text, text)
  to authenticated, service_role;


-- 4. Fixed create_member_admin RPC
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
  v_clean_ar_name text;
  v_clean_national_id text;
  v_season_id uuid;
  v_season_year text;
  v_committee_id uuid;
  v_member_code text;
  v_candidate_email text;
  v_user_id uuid;
begin
  -- 1. Caller authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'غير مصرح: يجب تسجيل الدخول للقيام بهذه العملية.');
  end if;

  -- 2. Verify caller role
  if not exists (
    select 1 from public.user_roles
    where user_id = v_caller_id
      and role in ('hr_admin', 'president', 'vice_president', 'super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: إضافة الأعضاء مقتصرة على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  -- 3. Validate name & national_id
  v_clean_ar_name := trim(coalesce(p_full_name_ar, ''));
  v_clean_national_id := trim(coalesce(p_national_id, ''));
  v_clean_national_id := translate(v_clean_national_id, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  v_clean_national_id := replace(v_clean_national_id, ' ', '');

  if length(v_clean_ar_name) < 3 then
    return jsonb_build_object('ok', false, 'error', 'يرجى إدخال اسم العضو باللغة العربية بشكل صحيح (3 أحرف على الأقل).');
  end if;

  if length(v_clean_national_id) <> 14 or v_clean_national_id !~ '^\d{14}$' then
    return jsonb_build_object('ok', false, 'error', 'الرقم القومي غير صحيح، يجب أن يتكون من 14 رقماً.');
  end if;

  -- Check existing national ID
  if exists (
    select 1 from public.profile_private
    where national_id = v_clean_national_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'يوجد عضو مسجل بالفعل بنفس الرقم القومي.');
  end if;

  -- 4. Resolve season
  if p_season_id is not null then
    select id, substring(name from '\d{4}') into v_season_id, v_season_year
    from public.seasons
    where id = p_season_id;
  end if;

  if v_season_id is null then
    select id, substring(name from '\d{4}') into v_season_id, v_season_year
    from public.seasons
    where is_active = true
    limit 1;
  end if;

  if v_season_year is null or length(v_season_year) <> 4 then
    v_season_year := to_char(now(), 'YYYY');
  end if;

  -- 5. Resolve committee
  if p_committee_id is not null then
    select id into v_committee_id from public.committees where id = p_committee_id;
  end if;
  if v_committee_id is null then
    select id into v_committee_id from public.committees where is_public = true order by sort_order asc limit 1;
  end if;

  -- 6. Generate member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 7. Determine login email
  if p_email is not null and trim(p_email) <> '' then
    v_candidate_email := lower(trim(p_email));
  else
    v_candidate_email := v_member_code || '@portal.enactusqena.org';
  end if;

  -- 8. Check auth user
  select id into v_user_id
  from auth.users
  where lower(email) = v_candidate_email
  limit 1;

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
        is_sso_user = false,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    where id = v_user_id;
  end if;

  -- Sync auth.identities
  delete from auth.identities
  where user_id = v_user_id
    and provider = 'email'
    and provider_id <> v_user_id::text;

  if exists (
    select 1 from auth.identities where user_id = v_user_id and provider = 'email'
  ) then
    update auth.identities
    set provider_id = v_user_id::text,
        identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_candidate_email),
        last_sign_in_at = now(),
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
        jsonb_build_object('sub', v_user_id::text, 'email', v_candidate_email),
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

  -- 9. Upsert profiles
  insert into public.profiles (
    id, full_name_ar, full_name_en, status, locale, member_code
  ) values (
    v_user_id, v_clean_ar_name, coalesce(nullif(trim(p_full_name_en), ''), v_clean_ar_name), 'active', 'ar', v_member_code
  )
  on conflict (id) do update set
    full_name_ar = excluded.full_name_ar,
    full_name_en = excluded.full_name_en,
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 10. Upsert profile_private
  insert into public.profile_private (
    user_id, email, phone, faculty, study_year, national_id, birth_date, gender, governorate
  ) values (
    v_user_id, v_candidate_email, nullif(trim(p_phone), ''), nullif(trim(p_faculty), ''),
    coalesce(p_study_year, 1), v_clean_national_id, p_birth_date, p_gender, nullif(trim(p_governorate), '')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profile_private.phone),
    faculty = coalesce(excluded.faculty, public.profile_private.faculty),
    study_year = coalesce(excluded.study_year, public.profile_private.study_year),
    national_id = excluded.national_id,
    birth_date = coalesce(excluded.birth_date, public.profile_private.birth_date),
    gender = coalesce(excluded.gender, public.profile_private.gender),
    governorate = coalesce(excluded.governorate, public.profile_private.governorate);

  -- 11. Memberships
  insert into public.memberships (
    user_id, season_id, committee_id, position, status, joined_at
  ) values (
    v_user_id, v_season_id, v_committee_id, coalesce(nullif(trim(p_position), ''), 'member'), 'active', current_date
  )
  on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- 12. user_roles
  if not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'member'
  ) then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', null, v_season_id, v_caller_id);
  end if;

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
-- 5. Automated Data Repair for Existing Members (e.g. Islam Shahat)
-- =====================================================================

-- Step 1: Ensure email_confirmed_at is set on all members in auth.users
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    is_sso_user = false,
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    updated_at = now()
where id in (select id from public.profiles);

-- Step 2: Ensure member password is set to 14-digit National ID if available
update auth.users au
set encrypted_password = extensions.crypt(replace(translate(trim(pp.national_id), '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', ''), extensions.gen_salt('bf')),
    updated_at = now()
from public.profile_private pp
where pp.user_id = au.id
  and pp.national_id is not null
  and length(replace(translate(trim(pp.national_id), '٠١٢٣٤٥٦٧٨٩', '0123456789'), ' ', '')) = 14;

-- Step 3: Delete invalid identities where provider_id does not match user_id
delete from auth.identities
where provider = 'email'
  and provider_id <> user_id::text
  and user_id in (select id from public.profiles);

-- Step 4: Ensure every profile in profiles has a valid email identity
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  au.id,
  jsonb_build_object('sub', au.id::text, 'email', lower(trim(au.email))),
  'email',
  au.id::text,
  now(),
  now(),
  now()
from auth.users au
join public.profiles p on p.id = au.id
where not exists (
  select 1 from auth.identities ai
  where ai.user_id = au.id and ai.provider = 'email'
)
on conflict do nothing;
