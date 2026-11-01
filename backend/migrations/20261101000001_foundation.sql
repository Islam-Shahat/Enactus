-- =====================================================================
-- 0001 FOUNDATION
-- Seasons, committees, profiles, roles, memberships, settings, audit,
-- and the private helper functions used by every RLS policy.
-- =====================================================================

-- Private schema: NOT exposed through the Data API. Helper functions live here.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public, anon;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Seasons (one active season at a time)
-- ---------------------------------------------------------------------
create table public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  check (ends_on > starts_on)
);
create unique index seasons_one_active_idx on public.seasons (is_active) where is_active;

-- ---------------------------------------------------------------------
-- Committees (global; membership per season lives in memberships)
-- ---------------------------------------------------------------------
create table public.committees (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_ar         text not null,
  name_en         text not null,
  description_ar  text,
  description_en  text,
  color           text not null default '#C9A227',
  icon            text,
  sort_order      int  not null default 0,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger committees_updated_at before update on public.committees
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Profiles: safe-to-share info (names, avatar). Contact data is separate.
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name_ar text,
  full_name_en text,
  avatar_url   text,
  bio          text,
  locale       text not null default 'ar' check (locale in ('ar', 'en')),
  status       text not null default 'active' check (status in ('active', 'suspended', 'alumni')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Sensitive contact data: visible only to the owner and HR/leadership.
create table public.profile_private (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  email          text,
  phone          text,
  university_id  text,
  faculty        text,
  study_year     smallint check (study_year between 1 and 8),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Roles. super_admin passes every check. committee_head is per committee.
-- ---------------------------------------------------------------------
create table public.user_roles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null check (role in (
                  'super_admin', 'president', 'vice_president',
                  'hr_admin', 'finance_admin', 'pr_admin', 'media_admin', 'oc_admin',
                  'committee_head', 'coordinator', 'member')),
  committee_id  uuid references public.committees (id) on delete cascade,
  season_id     uuid references public.seasons (id) on delete set null,
  granted_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (role <> 'committee_head' or committee_id is not null)
);
create unique index user_roles_unique_idx on public.user_roles
  (user_id, role, coalesce(committee_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index user_roles_user_idx on public.user_roles (user_id);
create index user_roles_committee_idx on public.user_roles (committee_id) where committee_id is not null;

-- ---------------------------------------------------------------------
-- Memberships: who is in which committee in which season
-- ---------------------------------------------------------------------
create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid not null references public.committees (id) on delete restrict,
  position      text not null default 'member' check (position in ('member', 'vice', 'head', 'coordinator')),
  status        text not null default 'active' check (status in ('active', 'left', 'alumni')),
  joined_at     date not null default current_date,
  left_at       date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, season_id, committee_id)
);
create index memberships_committee_season_idx on public.memberships (committee_id, season_id);
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Settings (feature flags such as applications_open) and audit log
-- ---------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  table_name  text not null,
  row_id      text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_table_idx on public.audit_logs (table_name, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- Generic audit trigger. SECURITY DEFINER so members' actions can be logged
-- even though nobody (except super_admin/president) can read the log.
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _pk text := coalesce(tg_argv[0], 'id');
begin
  insert into public.audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    (select auth.uid()),
    tg_op,
    tg_table_name,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> _pk else to_jsonb(new) ->> _pk end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function private.audit_row();
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function private.audit_row('key');

-- ---------------------------------------------------------------------
-- Auth helpers used by policies.
-- SECURITY DEFINER (so they can read user_roles without recursing into its
-- own RLS) but kept in the private schema and always bound to auth.uid().
-- ---------------------------------------------------------------------
create or replace function private.can(_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and (ur.role = 'super_admin' or ur.role = any (_roles))
  );
$$;

create or replace function private.is_head_of(_committee uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select _committee is not null and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'committee_head'
      and ur.committee_id = _committee
  );
$$;

create or replace function private.is_member_of(_committee uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select _committee is not null and exists (
    select 1
    from public.memberships m
    join public.seasons s on s.id = m.season_id and s.is_active
    where m.user_id = (select auth.uid())
      and m.committee_id = _committee
      and m.status = 'active'
  );
$$;

-- Is the current user head of any committee that _user belongs to (active season)?
create or replace function private.is_head_of_user(_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.seasons s on s.id = m.season_id and s.is_active
    join public.user_roles ur on ur.committee_id = m.committee_id
    where m.user_id = _user
      and m.status = 'active'
      and ur.user_id = (select auth.uid())
      and ur.role = 'committee_head'
  );
$$;

-- Any elevated role (everything except plain member)
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role <> 'member'
  );
$$;

grant execute on function
  private.can(text[]), private.is_head_of(uuid), private.is_member_of(uuid),
  private.is_head_of_user(uuid), private.is_staff()
to authenticated, service_role;

-- ---------------------------------------------------------------------
-- New auth user -> profile + private contact row.
-- Roles are NEVER granted here. Disable public sign-ups in Supabase Auth.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name_ar, full_name_en)
  values (new.id, new.raw_user_meta_data ->> 'full_name_ar', new.raw_user_meta_data ->> 'full_name_en');
  insert into public.profile_private (user_id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Members may edit their own profile but not their status.
create or replace function private.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and (select auth.uid()) is not null
     and not (select private.can(array['hr_admin', 'president', 'vice_president'])) then
    raise exception 'You are not allowed to change a member status';
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile_update();

-- Safety net: RLS on for every table (no policy = deny all)
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
