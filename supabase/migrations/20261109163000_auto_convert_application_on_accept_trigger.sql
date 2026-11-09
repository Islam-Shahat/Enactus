-- =====================================================================
-- Migration: 20261109163000_auto_convert_application_on_accept_trigger.sql
-- Description:
--   Automatic Instant Member Conversion & Immediate Login Engine:
--   1. Ensures GoTrue tokens are clean (non-null empty strings).
--   2. Updates public.convert_application_to_member to allow SQL Editor /
--      Dashboard execution, sets confirmed email and password = national_id.
--   3. Automatically converts applications on acceptance via trigger.
--   4. Converts the test applicant immediately into member 2026008.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1. Ensure GoTrue tokens are non-null strings
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


-- =====================================================================
-- 2. Fully Self-Contained convert_application_to_member RPC
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
  -- Caller authorization: allow SQL Editor / postgres role or authorized admin
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

  -- Fetch application record
  select * into v_app
  from public.applications
  where id = p_application_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'طلب التقديم غير موجود.');
  end if;

  -- Idempotency check: if already converted, re-sync auth credentials and return
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

  -- Resolve target committee
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

  -- Resolve active season & year
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

  -- Normalize phone, national_id & position
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

  -- Password: 14-digit National ID > Phone > Enactus@2026
  v_member_password := coalesce(v_clean_national_id, v_clean_phone, 'Enactus@2026');

  -- Generate sequential 7-digit member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- Provision user in auth.users
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

  -- Sync auth.identities
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

  -- Upsert profiles
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (v_user_id, v_app.full_name, v_app.full_name, 'active', 'ar', v_member_code)
  on conflict (id) do update set
    full_name_ar = coalesce(public.profiles.full_name_ar, excluded.full_name_ar),
    full_name_en = coalesce(public.profiles.full_name_en, excluded.full_name_en),
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- Upsert profile_private
  insert into public.profile_private (user_id, email, phone, faculty, study_year, national_id)
  values (v_user_id, lower(trim(v_app.email)), v_clean_phone, v_app.faculty, v_app.study_year, v_clean_national_id)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(public.profile_private.phone, excluded.phone),
    faculty = coalesce(public.profile_private.faculty, excluded.faculty),
    study_year = coalesce(public.profile_private.study_year, excluded.study_year),
    national_id = coalesce(excluded.national_id, public.profile_private.national_id);

  -- Upsert memberships
  insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
  values (v_user_id, v_season_id, v_committee_id, v_target_position, 'active', current_date)
  on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- Assign 'member' user_role
  if not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'member'
  ) then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', null, v_season_id, v_caller_id);
  end if;

  -- Update applications record
  update public.applications set
    status = 'accepted',
    converted_user_id = v_user_id,
    reviewed_by = coalesce(reviewed_by, v_caller_id),
    updated_at = now()
  where id = v_app.id;

  -- Master credentials sync
  perform public.sync_member_auth_credentials(v_user_id);

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
  to anon, authenticated, service_role;


-- =====================================================================
-- 3. Automatic Trigger on Application Acceptance
-- =====================================================================
create or replace function public.trg_auto_convert_accepted_application()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  -- Prevent recursive trigger loops
  if pg_trigger_depth() > 1 then
    return NEW;
  end if;

  -- Fire only when application status is 'accepted' and user has not been converted yet
  if NEW.status = 'accepted' and (
    TG_OP = 'INSERT' 
    or OLD.status is distinct from 'accepted' 
    or NEW.converted_user_id is null
  ) then
    perform public.convert_application_to_member(NEW.id, null, 'member');
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_auto_convert_application on public.applications;

create trigger trg_auto_convert_application
  after insert or update of status on public.applications
  for each row
  when (NEW.status = 'accepted')
  execute function public.trg_auto_convert_accepted_application();


-- =====================================================================
-- 4. Instant Execution: Convert test applicant & pending accepted apps
-- =====================================================================
do $$
declare
  r record;
begin
  -- 1. Convert all existing applications with status = 'accepted' but missing converted_user_id
  for r in (
    select id from public.applications
    where status = 'accepted' and converted_user_id is null
  ) loop
    perform public.convert_application_to_member(r.id, null, 'member');
  end loop;

  -- 2. Convert the test applicant automatically into active member
  for r in (
    select id from public.applications
    where email = 'test_fake_applicant_99@enactusqena.org' and converted_user_id is null
  ) loop
    perform public.convert_application_to_member(r.id, 'presentation', 'member');
  end loop;
end;
$$;

-- Run master credentials sync to ensure all members are verified
select public.sync_member_auth_credentials(null);
