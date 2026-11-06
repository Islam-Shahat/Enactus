-- =====================================================================
-- Migration: 20261106090000_secure_member_conversion_and_creation.sql
-- Description:
-- 1. Create public.convert_application_to_member RPC function (SECURITY DEFINER)
--    allowing HR & Leadership to accept applicants and convert them directly
--    into active members with generated member_codes, profiles, memberships,
--    and user_roles, without depending on external Edge Functions.
-- 2. Create public.create_member_admin RPC function (SECURITY DEFINER)
--    allowing HR & Leadership to manually add new members directly into
--    auth.users, profiles, profile_private, and memberships.
-- 3. Explicit GRANTs to authenticated and service_role.
-- =====================================================================

-- 1. convert_application_to_member
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
  v_target_position text;
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

  -- 4. Idempotency check: if already converted, return existing user
  if v_app.converted_user_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyConverted', true,
      'userId', v_app.converted_user_id,
      'status', v_app.status,
      'message', 'تم تحويل المتقدم بالفعل إلى عضو نشط مسبقاً.'
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

  -- 7. Normalize phone & position
  v_clean_phone := nullif(trim(coalesce(v_app.phone, '')), '');
  v_target_position := coalesce(nullif(trim(p_position), ''), 'member');
  if v_target_position not in ('member', 'coordinator', 'vice', 'head') then
    v_target_position := 'member';
  end if;

  -- 8. Find or provision user in auth.users
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(v_app.email))
  limit 1;

  if v_user_id is null then
    -- Check profile_private as secondary lookup
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
      crypt(coalesce(v_clean_phone, 'Enactus@2026'), gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name_ar', v_app.full_name,
        'full_name_en', v_app.full_name
      ),
      now(),
      now()
    );

    -- Sync auth.identities if table exists
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
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(v_app.email))),
        'email',
        lower(trim(v_app.email)),
        now(),
        now(),
        now()
      );
    exception when others then
      null;
    end;
  end if;

  -- 9. Generate sequential 7-digit member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 10. Upsert profiles
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (v_user_id, v_app.full_name, v_app.full_name, 'active', 'ar', v_member_code)
  on conflict (id) do update set
    full_name_ar = coalesce(public.profiles.full_name_ar, excluded.full_name_ar),
    full_name_en = coalesce(public.profiles.full_name_en, excluded.full_name_en),
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 11. Upsert profile_private
  insert into public.profile_private (user_id, email, phone, faculty, study_year)
  values (v_user_id, lower(trim(v_app.email)), v_clean_phone, v_app.faculty, v_app.study_year)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(public.profile_private.phone, excluded.phone),
    faculty = coalesce(public.profile_private.faculty, excluded.faculty),
    study_year = coalesce(public.profile_private.study_year, excluded.study_year);

  -- 12. Upsert memberships
  insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
  values (v_user_id, v_season_id, v_committee_id, v_target_position, 'active', current_date)
  on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- 13. Assign 'member' user_role if not present
  if not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'member'
  ) then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', null, v_season_id, v_caller_id);
  end if;

  -- 14. Update applications record
  update public.applications set
    status = 'accepted',
    converted_user_id = v_user_id,
    reviewed_by = coalesce(reviewed_by, v_caller_id),
    updated_at = now()
  where id = v_app.id;

  -- 15. Record audit / notification
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_caller_id,
      'application_converted',
      'تم قبول المتقدم وتحويله لعضو',
      'تم تحويل ' || v_app.full_name || ' إلى عضو رسمي في الفريق بنجاح.',
      jsonb_build_object(
        'application_id', v_app.id,
        'user_id', v_user_id,
        'member_code', v_member_code,
        'committee_id', v_committee_id
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

grant execute on function public.convert_application_to_member(uuid, text, text) to authenticated, service_role;


-- 2. create_member_admin
create or replace function public.create_member_admin(
  p_full_name_ar text,
  p_full_name_en text default null,
  p_national_id text default null,
  p_phone text default null,
  p_email text default null,
  p_committee_id uuid default null,
  p_position text default 'member',
  p_faculty text default null,
  p_study_year int default null,
  p_birth_date date default null,
  p_gender text default null,
  p_governorate text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid;
  v_season_id uuid;
  v_season_year text;
  v_member_code text;
  v_candidate_email text;
  v_user_id uuid;
  v_target_position text;
  v_clean_national_id text;
  v_clean_ar_name text;
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
    return jsonb_build_object('ok', false, 'error', 'صلاحيات غير كافية: إضافة الأعضاء مقتصرة على مسؤولي الموارد البشرية وإدارة الفريق.');
  end if;

  -- 3. Validate name and national id
  v_clean_ar_name := trim(coalesce(p_full_name_ar, ''));
  if length(v_clean_ar_name) < 3 then
    return jsonb_build_object('ok', false, 'error', 'يرجى إدخال اسم العضو ثلاثياً بالعربية على الأقل.');
  end if;

  v_clean_national_id := trim(coalesce(p_national_id, ''));
  if v_clean_national_id <> '' and not (v_clean_national_id ~ '^\d{14}$') then
    return jsonb_build_object('ok', false, 'error', 'الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً.');
  end if;

  -- Check national ID uniqueness if supplied
  if v_clean_national_id <> '' and exists (
    select 1 from public.profile_private where national_id = v_clean_national_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'يوجد عضو مسجل بالفعل بنفس الرقم القومي.');
  end if;

  -- 4. Verify target committee exists
  if p_committee_id is null or not exists (
    select 1 from public.committees where id = p_committee_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'اللجنة المختارة غير موجودة.');
  end if;

  -- 5. Resolve active season & year
  select id, substring(name from '\d{4}') into v_season_id, v_season_year
  from public.seasons
  where is_active = true
  limit 1;

  if v_season_id is null then
    select id, substring(name from '\d{4}') into v_season_id, v_season_year
    from public.seasons
    order by created_at desc
    limit 1;
  end if;

  if v_season_id is null then
    return jsonb_build_object('ok', false, 'error', 'لا يوجد موسم نشط مسجل بالنظام.');
  end if;

  if v_season_year is null or length(v_season_year) <> 4 then
    v_season_year := to_char(now(), 'YYYY');
  end if;

  -- 6. Generate next 7-digit sequential member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 7. Determine login email
  if p_email is not null and trim(p_email) <> '' then
    v_candidate_email := lower(trim(p_email));
  else
    v_candidate_email := v_member_code || '@portal.enactusqena.org';
  end if;

  -- 8. Check if auth user exists with email
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
      crypt(coalesce(nullif(v_clean_national_id, ''), nullif(trim(p_phone), ''), 'Enactus@2026'), gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name_ar', v_clean_ar_name,
        'full_name_en', coalesce(nullif(trim(p_full_name_en), ''), v_clean_ar_name)
      ),
      now(),
      now()
    );

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
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_candidate_email),
        'email',
        v_candidate_email,
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
    id,
    full_name_ar,
    full_name_en,
    status,
    locale,
    member_code
  ) values (
    v_user_id,
    v_clean_ar_name,
    coalesce(nullif(trim(p_full_name_en), ''), v_clean_ar_name),
    'active',
    'ar',
    v_member_code
  ) on conflict (id) do update set
    full_name_ar = excluded.full_name_ar,
    full_name_en = excluded.full_name_en,
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 10. Upsert profile_private
  insert into public.profile_private (
    user_id,
    email,
    phone,
    national_id,
    faculty,
    study_year,
    birth_date,
    gender,
    governorate
  ) values (
    v_user_id,
    v_candidate_email,
    nullif(trim(p_phone), ''),
    nullif(v_clean_national_id, ''),
    nullif(trim(p_faculty), ''),
    p_study_year,
    p_birth_date,
    p_gender,
    nullif(trim(p_governorate), '')
  ) on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profile_private.phone),
    national_id = coalesce(excluded.national_id, public.profile_private.national_id),
    faculty = coalesce(excluded.faculty, public.profile_private.faculty),
    study_year = coalesce(excluded.study_year, public.profile_private.study_year),
    birth_date = coalesce(excluded.birth_date, public.profile_private.birth_date),
    gender = coalesce(excluded.gender, public.profile_private.gender),
    governorate = coalesce(excluded.governorate, public.profile_private.governorate);

  -- 11. Normalize position & upsert memberships
  v_target_position := coalesce(nullif(trim(p_position), ''), 'member');
  if v_target_position not in ('member', 'coordinator', 'vice', 'head') then
    v_target_position := 'member';
  end if;

  insert into public.memberships (
    user_id,
    season_id,
    committee_id,
    position,
    status,
    joined_at
  ) values (
    v_user_id,
    v_season_id,
    p_committee_id,
    v_target_position,
    'active',
    current_date
  ) on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- 12. Assign 'member' role in user_roles
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
    'committeeId', p_committee_id,
    'seasonId', v_season_id,
    'message', 'Member created and enrolled successfully'
  );
end;
$$;

grant execute on function public.create_member_admin(text, text, text, text, text, uuid, text, text, int, date, text, text) to authenticated, service_role;
