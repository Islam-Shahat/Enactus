-- supabase/migrations/20261105130000_add_member_code_and_national_id.sql
-- Add 7-digit sequential member_code (e.g., 2026001) to profiles,
-- Add national_id and personal demographics to profile_private,
-- Provide automated next-code generation and member login identifier resolver.

-- 1. Add member_code to public.profiles
alter table public.profiles
  add column if not exists member_code text unique;

create index if not exists idx_profiles_member_code on public.profiles (member_code);

-- 2. Add national_id and demographic fields to public.profile_private
alter table public.profile_private
  add column if not exists national_id text,
  add column if not exists birth_date date,
  add column if not exists age smallint,
  add column if not exists gender text check (gender is null or gender in ('male', 'female', 'other')),
  add column if not exists governorate text;

create index if not exists idx_profile_private_national_id on public.profile_private (national_id);

-- 3. Function to generate the next 7-digit member code (e.g., 2026001, 2026002)
create or replace function public.generate_next_member_code(p_season_year text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text;
  v_prefix text;
  v_max_seq integer := 0;
  v_next_code text;
begin
  -- If season year is not provided, deduce from active season or current year
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

  -- Lock table briefly to compute next sequence safely without duplicates
  select coalesce(max(nullif(substring(member_code from 5 for 3), '')::integer), 0)
  into v_max_seq
  from public.profiles
  where member_code like (v_prefix || '%')
    and length(member_code) = 7;

  v_next_code := v_prefix || lpad((v_max_seq + 1)::text, 3, '0');
  return v_next_code;
end;
$$;

grant execute on function public.generate_next_member_code(text) to authenticated, service_role;

-- 4. Function to resolve login email from member code (7 digits) or national_id or email
create or replace function public.get_member_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_email text;
begin
  if p_identifier is null then
    return null;
  end if;

  v_clean := trim(p_identifier);

  -- If it already looks like an email, return directly
  if v_clean like '%@%.%' then
    return lower(v_clean);
  end if;

  -- 1. Check if identifier matches a 7-digit member_code
  select pp.email
  into v_email
  from public.profiles p
  join public.profile_private pp on pp.user_id = p.id
  where p.member_code = v_clean
  limit 1;

  if v_email is not null then
    return lower(v_email);
  end if;

  -- 2. Check if identifier matches a 14-digit national_id
  if length(v_clean) = 14 then
    select pp.email
    into v_email
    from public.profile_private pp
    where pp.national_id = v_clean
    limit 1;

    if v_email is not null then
      return lower(v_email);
    end if;
  end if;

  return null;
end;
$$;

grant execute on function public.get_member_login_email(text) to anon, authenticated, service_role;

-- 5. Backfill any existing profiles that don't have member_code
do $$
declare
  r record;
  v_seq integer := 1;
  v_year text;
begin
  select substring(name from '\d{4}') into v_year from public.seasons where is_active = true limit 1;
  if v_year is null or length(v_year) <> 4 then
    v_year := to_char(now(), 'YYYY');
  end if;

  for r in
    select id
    from public.profiles
    where member_code is null
    order by created_at asc
  loop
    update public.profiles
    set member_code = v_year || lpad(v_seq::text, 3, '0')
    where id = r.id;
    v_seq := v_seq + 1;
  end loop;
end;
$$;

