-- =====================================================================
-- Migration: 20261109172000_sync_accepted_applicant_profile_details.sql
-- Description:
--   1. Fixes convert_application_to_member so that when an applicant is
--      converted (even if a user account / test profile previously existed
--      with that email), the profile's full_name_ar, full_name_en, faculty,
--      study_year, phone, and national_id are properly updated from the
--      accepted application data rather than preserving stale/dummy values.
--   2. Updates auth.users raw_user_meta_data to match the applicant's name.
--   3. Synchronizes all existing accepted applications into their respective
--      member profiles (e.g. updating member 2026007 from 'booy bat' to
--      'اسلام عبدالموجود').
--   4. Re-syncs auth credentials for all active members.
-- =====================================================================

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
  v_user_id uuid;
  v_season_id uuid;
  v_season_year text;
  v_committee_id uuid;
  v_member_code text;
  v_clean_national_id text;
  v_clean_phone text;
  v_member_password text;
  v_target_position text;
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
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
          'full_name_ar', v_app.full_name,
          'full_name_en', v_app.full_name
        ),
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

  -- Upsert profiles: priority given to applicant's actual full_name
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (v_user_id, v_app.full_name, v_app.full_name, 'active', 'ar', v_member_code)
  on conflict (id) do update set
    full_name_ar = coalesce(excluded.full_name_ar, public.profiles.full_name_ar),
    full_name_en = coalesce(excluded.full_name_en, public.profiles.full_name_en),
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- Upsert profile_private: priority given to applicant's academic & contact info
  insert into public.profile_private (user_id, email, phone, faculty, study_year, national_id)
  values (v_user_id, lower(trim(v_app.email)), v_clean_phone, v_app.faculty, v_app.study_year, v_clean_national_id)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profile_private.phone),
    faculty = coalesce(excluded.faculty, public.profile_private.faculty),
    study_year = coalesce(excluded.study_year, public.profile_private.study_year),
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

  -- Run master credentials sync for this user
  perform public.sync_member_auth_credentials(v_user_id);

  -- Retrieve updated member code
  select member_code into v_member_code
  from public.profiles
  where id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'userId', v_user_id,
    'memberCode', v_member_code,
    'email', lower(trim(v_app.email)),
    'fullName', v_app.full_name,
    'committeeId', v_committee_id,
    'position', v_target_position,
    'password', v_member_password,
    'message', 'Application converted to active member successfully'
  );
end;
$$;

grant execute on function public.convert_application_to_member(uuid, text, text)
  to anon, authenticated, service_role;


-- =====================================================================
-- 2. Immediate Data Repair for All Accepted Applications
-- =====================================================================
do $$
declare
  r record;
  v_uid uuid;
begin
  for r in (
    select
      a.id as app_id,
      a.full_name,
      a.email,
      a.faculty,
      a.study_year,
      a.phone,
      coalesce(a.national_id, a.answers->>'nationalId') as national_id,
      a.converted_user_id
    from public.applications a
    where a.status = 'accepted'
  ) loop
    v_uid := r.converted_user_id;

    if v_uid is null then
      select id into v_uid from auth.users where lower(email) = lower(trim(r.email)) limit 1;
      if v_uid is null then
        select user_id into v_uid from public.profile_private where lower(email) = lower(trim(r.email)) limit 1;
      end if;
    end if;

    if v_uid is not null then
      -- Link to application
      update public.applications
      set converted_user_id = v_uid
      where id = r.app_id and converted_user_id is null;

      -- Update profile name to match applicant's real name
      update public.profiles
      set full_name_ar = r.full_name,
          full_name_en = r.full_name,
          status = 'active'
      where id = v_uid;

      -- Update private academic & contact details
      update public.profile_private
      set faculty = coalesce(r.faculty, faculty),
          study_year = coalesce(r.study_year, study_year),
          national_id = coalesce(r.national_id, national_id),
          phone = coalesce(r.phone, phone)
      where user_id = v_uid;

      -- Update auth metadata
      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'full_name_ar', r.full_name,
        'full_name_en', r.full_name
      )
      where id = v_uid;
    else
      -- If not linked at all, convert directly
      perform public.convert_application_to_member(r.app_id, null, 'member');
    end if;
  end loop;
end;
$$;

-- Run master credentials sync to refresh passwords and confirmation
select public.sync_member_auth_credentials(null);
