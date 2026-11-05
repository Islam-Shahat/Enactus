-- =====================================================================
-- Migration: 20261105224500_secure_application_submission.sql
-- Description:
-- 1. Create public.submit_recruitment_application RPC function (SECURITY DEFINER)
--    allowing public candidates to submit recruitment applications directly,
--    enforcing server-side validation, season resolution, deduplication,
--    and settings.applications_open check without depending on external Edge Functions.
-- 2. Add insert policy on public.applications for anon/authenticated (fallback)
-- 3. Add insert policy on storage.objects for 'cvs' bucket for anon/authenticated
-- 4. Explicit GRANTs to anon and authenticated
-- =====================================================================

create or replace function public.submit_recruitment_application(
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_faculty text default null,
  p_study_year text default null,
  p_committee_slug text default null,
  p_motivation text default null,
  p_answers jsonb default '{}'::jsonb,
  p_cv_url text default null
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

  -- 6. Deduplication check: check if already applied in this season
  select id into v_existing_id
  from public.applications
  where season_id = v_season_id and lower(trim(email)) = v_clean_email
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyApplied', true,
      'id', v_existing_id,
      'applicationId', v_existing_id,
      'message', 'لقد تم تسجيل طلب انضمام بهذا البريد الإلكتروني بالفعل لهذا الموسم.'
    );
  end if;

  -- 7. Resolve committee choice
  if p_committee_slug is not null and trim(p_committee_slug) <> '' then
    -- Try exact match on slug, english name, or arabic name
    select id into v_committee_id
    from public.committees
    where lower(trim(slug)) = lower(trim(p_committee_slug))
       or lower(trim(name_en)) = lower(trim(p_committee_slug))
       or trim(name_ar) = trim(p_committee_slug)
    limit 1;

    -- Try partial match (e.g. 'PM', 'HR', 'PR', 'OC', 'Presentation', 'Media')
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

-- Grant execution to anon, authenticated, and service_role
grant execute on function public.submit_recruitment_application(text, text, text, text, text, text, text, jsonb, text)
  to anon, authenticated, service_role;

-- 9. Add fallback RLS INSERT policy and grant on public.applications
grant insert on public.applications to anon, authenticated;

drop policy if exists applications_insert_anon on public.applications;
create policy applications_insert_anon on public.applications
  for insert to anon, authenticated
  with check (
    full_name is not null and
    email is not null and
    status = 'new'
  );

-- 10. Allow CV upload to 'cvs' bucket for applicants
drop policy if exists cvs_insert_anon on storage.objects;
create policy cvs_insert_anon on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'cvs');
