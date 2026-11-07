-- =====================================================================
-- Migration: 20261107180000_add_national_id_to_recruitment.sql
-- Description:
-- 1. Add national_id column to public.applications table with index.
-- 2. Update submit_recruitment_application RPC to accept and validate
--    the 14-digit Egyptian National ID and enforce deduplication.
-- 3. Update convert_application_to_member RPC to set the member's
--    default login password in auth.users to their 14-digit National ID
--    and record national_id into public.profile_private.
-- 4. Explicit GRANTs to anon, authenticated, and service_role.
-- =====================================================================

-- 1. Add national_id to public.applications
alter table public.applications
  add column if not exists national_id text;

create index if not exists idx_applications_national_id
  on public.applications (national_id)
  where national_id is not null;

-- 2. submit_recruitment_application RPC
create or replace function public.submit_recruitment_application(
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_faculty text default null,
  p_study_year text default null,
  p_committee_slug text default null,
  p_motivation text default null,
  p_answers jsonb default '{}'::jsonb,
  p_cv_url text default null,
  p_national_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_name text;
  v_clean_email text;
  v_clean_phone text;
  v_clean_faculty text;
  v_clean_motivation text;
  v_clean_study_year smallint;
  v_clean_national_id text;
  v_open_setting record;
  v_season_id uuid;
  v_committee_id uuid;
  v_existing_id uuid;
  v_new_id uuid;
begin
  -- 1. Sanitize text inputs
  v_clean_name := trim(coalesce(p_full_name, ''));
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_clean_faculty := nullif(trim(coalesce(p_faculty, '')), '');
  v_clean_motivation := nullif(trim(coalesce(p_motivation, '')), '');
  v_clean_national_id := nullif(trim(coalesce(p_national_id, '')), '');

  -- Fallback check for nationalId inside p_answers
  if v_clean_national_id is null and p_answers ? 'nationalId' then
    v_clean_national_id := nullif(trim(coalesce(p_answers->>'nationalId', '')), '');
  end if;

  -- 2. Validate mandatory fields
  if length(v_clean_name) < 3 then
    return jsonb_build_object(
      'ok', false,
      'error', 'الرجاء إدخال الاسم بالكامل بشكل صحيح (ثلاثي أو رباعي).'
    );
  end if;

  if length(v_clean_email) < 5 or position('@' in v_clean_email) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'الرجاء إدخال بريد إلكتروني صالح.'
    );
  end if;

  -- Validate national_id format if provided
  if v_clean_national_id is not null and not (v_clean_national_id ~ '^\d{14}$') then
    return jsonb_build_object(
      'ok', false,
      'error', 'الرقم القومي غير صالح، يجب أن يتكون من 14 رقماً مصرياً.'
    );
  end if;

  -- 3. Parse study year safely
  if p_study_year is not null and trim(p_study_year) <> '' then
    if trim(p_study_year) ~ '^[0-9]+$' then
      v_clean_study_year := greatest(1, least(8, trim(p_study_year)::int))::smallint;
    elsif p_study_year ilike '%أول%' or p_study_year ilike '%first%' or p_study_year ilike '%1st%' then
      v_clean_study_year := 1;
    elsif p_study_year ilike '%ثاني%' or p_study_year ilike '%second%' or p_study_year ilike '%2nd%' then
      v_clean_study_year := 2;
    elsif p_study_year ilike '%ثالث%' or p_study_year ilike '%third%' or p_study_year ilike '%3rd%' then
      v_clean_study_year := 3;
    elsif p_study_year ilike '%رابع%' or p_study_year ilike '%fourth%' or p_study_year ilike '%4th%' then
      v_clean_study_year := 4;
    elsif p_study_year ilike '%خامس%' or p_study_year ilike '%fifth%' or p_study_year ilike '%5th%' then
      v_clean_study_year := 5;
    else
      v_clean_study_year := 1;
    end if;
  else
    v_clean_study_year := 1;
  end if;

  -- 4. Check settings.applications_open
  select value into v_open_setting from public.settings where key = 'applications_open';
  if found and v_open_setting.value is not null then
    if lower(trim(both '"' from v_open_setting.value::text)) = 'false' then
      return jsonb_build_object(
        'ok', false,
        'error', 'التقديم مغلق حالياً لهذا الموسم.'
      );
    end if;
  end if;

  -- 5. Resolve active season
  select id into v_season_id from public.seasons where is_active = true limit 1;
  if v_season_id is null then
    select id into v_season_id from public.seasons order by created_at desc limit 1;
  end if;

  if v_season_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'لا يوجد موسم نشط حالياً لاستقبال الطلبات.'
    );
  end if;

  -- 6. Deduplication check: check if already applied in this season by email OR national_id
  select id into v_existing_id
  from public.applications
  where season_id = v_season_id
    and (
      lower(trim(email)) = v_clean_email
      or (v_clean_national_id is not null and national_id = v_clean_national_id)
    )
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyApplied', true,
      'id', v_existing_id,
      'applicationId', v_existing_id,
      'message', 'لقد تم تسجيل طلب انضمام بهذا البريد الإلكتروني أو الرقم القومي بالفعل لهذا الموسم.'
    );
  end if;

  -- 7. Resolve committee choice
  if p_committee_slug is not null and trim(p_committee_slug) <> '' then
    select id into v_committee_id
    from public.committees
    where lower(trim(slug)) = lower(trim(p_committee_slug))
       or lower(trim(name_en)) = lower(trim(p_committee_slug))
       or trim(name_ar) = trim(p_committee_slug)
    limit 1;

    if v_committee_id is null then
      select id into v_committee_id
      from public.committees
      where trim(p_committee_slug) ilike '%' || trim(slug) || '%'
         or trim(p_committee_slug) ilike '%' || trim(name_en) || '%'
         or trim(p_committee_slug) like '%' || trim(name_ar) || '%'
         or trim(name_ar) like '%' || trim(p_committee_slug) || '%'
      order by sort_order asc
      limit 1;
    end if;
  end if;

  -- 8. Insert new application
  v_new_id := gen_random_uuid();

  insert into public.applications (
    id,
    season_id,
    full_name,
    national_id,
    email,
    phone,
    faculty,
    study_year,
    first_choice_id,
    motivation,
    answers,
    cv_url,
    status,
    created_at,
    updated_at
  ) values (
    v_new_id,
    v_season_id,
    v_clean_name,
    v_clean_national_id,
    v_clean_email,
    v_clean_phone,
    v_clean_faculty,
    v_clean_study_year,
    v_committee_id,
    v_clean_motivation,
    coalesce(p_answers, '{}'::jsonb),
    nullif(trim(coalesce(p_cv_url, '')), ''),
    'new',
    now(),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'applicationId', v_new_id,
    'message', 'تم تقديم طلب الانضمام بنجاح!'
  );
end;
$$;

grant execute on function public.submit_recruitment_application(text, text, text, text, text, text, text, jsonb, text, text)
  to anon, authenticated, service_role;


-- 3. Update convert_application_to_member RPC to use National ID as Member Password
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

  -- 7. Normalize phone, national_id & position
  v_clean_phone := nullif(trim(coalesce(v_app.phone, '')), '');
  v_clean_national_id := nullif(trim(coalesce(v_app.national_id, v_app.answers->>'nationalId', '')), '');
  v_target_position := coalesce(nullif(trim(p_position), ''), 'member');
  if v_target_position not in ('member', 'coordinator', 'vice', 'head') then
    v_target_position := 'member';
  end if;

  -- 8. Determine member default password:
  -- Priority 1: 14-digit National ID
  -- Priority 2: Phone number
  -- Priority 3: Fallback secure password Enactus@2026
  v_member_password := coalesce(v_clean_national_id, v_clean_phone, 'Enactus@2026');

  -- 9. Find or provision user in auth.users
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
      crypt(v_member_password, gen_salt('bf')),
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
  else
    -- If user already exists in auth.users and applicant provided a national_id,
    -- sync the member's password to their national ID
    if v_clean_national_id is not null then
      update auth.users
      set encrypted_password = crypt(v_clean_national_id, gen_salt('bf')),
          updated_at = now()
      where id = v_user_id;
    end if;
  end if;

  -- 10. Generate sequential 7-digit member code
  v_member_code := public.generate_next_member_code(v_season_year);

  -- 11. Upsert profiles
  insert into public.profiles (id, full_name_ar, full_name_en, status, locale, member_code)
  values (v_user_id, v_app.full_name, v_app.full_name, 'active', 'ar', v_member_code)
  on conflict (id) do update set
    full_name_ar = coalesce(public.profiles.full_name_ar, excluded.full_name_ar),
    full_name_en = coalesce(public.profiles.full_name_en, excluded.full_name_en),
    member_code = coalesce(public.profiles.member_code, excluded.member_code),
    status = 'active';

  -- 12. Upsert profile_private with national_id
  insert into public.profile_private (user_id, email, phone, faculty, study_year, national_id)
  values (v_user_id, lower(trim(v_app.email)), v_clean_phone, v_app.faculty, v_app.study_year, v_clean_national_id)
  on conflict (user_id) do update set
    email = excluded.email,
    phone = coalesce(public.profile_private.phone, excluded.phone),
    faculty = coalesce(public.profile_private.faculty, excluded.faculty),
    study_year = coalesce(public.profile_private.study_year, excluded.study_year),
    national_id = coalesce(excluded.national_id, public.profile_private.national_id);

  -- 13. Upsert memberships
  insert into public.memberships (user_id, season_id, committee_id, position, status, joined_at)
  values (v_user_id, v_season_id, v_committee_id, v_target_position, 'active', current_date)
  on conflict (user_id, season_id, committee_id) do update set
    position = excluded.position,
    status = 'active';

  -- 14. Assign 'member' user_role if not present
  if not exists (
    select 1 from public.user_roles where user_id = v_user_id and role = 'member'
  ) then
    insert into public.user_roles (user_id, role, committee_id, season_id, granted_by)
    values (v_user_id, 'member', null, v_season_id, v_caller_id);
  end if;

  -- 15. Update applications record
  update public.applications set
    status = 'accepted',
    converted_user_id = v_user_id,
    reviewed_by = coalesce(reviewed_by, v_caller_id),
    updated_at = now()
  where id = v_app.id;

  -- 16. Record audit / notification
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

