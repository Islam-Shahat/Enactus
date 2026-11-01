-- =====================================================================
-- 0004 EVENTS + PUBLIC SITE CONTENT
-- Public pages read curated tables (partners, team_public, site_stats...)
-- instead of internal tables, so no private column can ever leak.
-- =====================================================================

create table public.events (
  id                        uuid primary key default gen_random_uuid(),
  season_id                 uuid not null references public.seasons (id) on delete cascade,
  slug                      text not null unique,
  title_ar                  text not null,
  title_en                  text,
  description_ar            text,
  description_en            text,
  venue_ar                  text,
  venue_en                  text,
  starts_at                 timestamptz not null,
  ends_at                   timestamptz,
  capacity                  int check (capacity is null or capacity > 0),
  status                    text not null default 'draft'
                            check (status in ('draft', 'published', 'ongoing', 'completed', 'cancelled')),
  cover_url                 text,
  organizing_committee_id   uuid references public.committees (id) on delete set null,
  registration_open         boolean not null default false,
  is_public                 boolean not null default false,
  impact                    jsonb not null default '{}'::jsonb,
  created_by                uuid references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_season_start_idx on public.events (season_id, starts_at desc);
create index events_public_idx on public.events (starts_at desc) where is_public;
create index events_committee_idx on public.events (organizing_committee_id);
create index events_creator_idx on public.events (created_by);
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();

-- Now that events exist, wire the deferred foreign keys
alter table public.attendance_sessions
  add constraint attendance_sessions_event_fk foreign key (event_id) references public.events (id) on delete set null;
create index attendance_sessions_event_idx on public.attendance_sessions (event_id);
alter table public.expenses
  add constraint expenses_event_fk foreign key (event_id) references public.events (id) on delete set null;
create index expenses_event_idx on public.expenses (event_id);
alter table public.budgets
  add constraint budgets_event_fk foreign key (event_id) references public.events (id) on delete cascade;
create index budgets_event_idx on public.budgets (event_id);

create table public.event_roles (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  name          text not null,
  needed_count  int not null default 1 check (needed_count > 0)
);
create index event_roles_event_idx on public.event_roles (event_id);

create table public.event_volunteers (
  event_id  uuid not null references public.events (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role_id   uuid references public.event_roles (id) on delete set null,
  status    text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_volunteers_user_idx on public.event_volunteers (user_id);
create index event_volunteers_role_idx on public.event_volunteers (role_id);

-- Public registrations are inserted by an Edge Function (capacity + CAPTCHA).
create table public.event_registrations (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  full_name      text not null,
  email          text not null,
  phone          text,
  ticket_code    text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  status         text not null default 'registered' check (status in ('registered', 'waitlist', 'cancelled', 'attended')),
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (event_id, email)
);
create index event_registrations_event_status_idx on public.event_registrations (event_id, status);

create table public.event_sponsors (
  event_id    uuid not null references public.events (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  primary key (event_id, company_id)
);
create index event_sponsors_company_idx on public.event_sponsors (company_id);

create table public.event_feedback (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);
create index event_feedback_event_idx on public.event_feedback (event_id);

-- ---------------------------------------------------------------------
-- Curated public content (edited from the dashboard)
-- ---------------------------------------------------------------------
create table public.partners (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies (id) on delete set null,
  name_ar           text not null,
  name_en           text,
  kind              text not null default 'sponsor' check (kind in ('sponsor', 'partner', 'strategic')),
  tier              text check (tier in ('platinum', 'gold', 'silver', 'bronze')),
  logo_url          text,
  website           text,
  description_ar    text,
  description_en    text,
  cover_url         text,
  announced_at      date,
  since_year        smallint,
  sort_order        int not null default 0,
  is_visible        boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index partners_company_idx on public.partners (company_id);
create index partners_visible_idx on public.partners (sort_order) where is_visible;
create trigger partners_updated_at before update on public.partners
  for each row execute function private.set_updated_at();

create table public.team_public (
  id                uuid primary key default gen_random_uuid(),
  season_id         uuid references public.seasons (id) on delete cascade,
  user_id           uuid references public.profiles (id) on delete set null,
  committee_id      uuid references public.committees (id) on delete set null,
  kind              text not null default 'member' check (kind in ('board', 'head', 'member', 'alumni')),
  name_ar           text not null,
  name_en           text,
  position_ar       text,
  position_en       text,
  bio_ar            text,
  bio_en            text,
  photo_url         text,
  links             jsonb not null default '{}'::jsonb,
  graduation_year   smallint,
  sort_order        int not null default 0,
  is_visible        boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index team_public_season_idx on public.team_public (season_id, kind);
create index team_public_committee_idx on public.team_public (committee_id);
create index team_public_user_idx on public.team_public (user_id);
create trigger team_public_updated_at before update on public.team_public
  for each row execute function private.set_updated_at();

create table public.site_stats (
  key         text primary key,
  value       bigint not null,
  suffix      text,
  label_ar    text not null,
  label_en    text not null,
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table public.site_content (
  key         text not null,
  locale      text not null check (locale in ('ar', 'en')),
  value       jsonb not null,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (key, locale)
);
create index site_content_updated_by_idx on public.site_content (updated_by);

create table public.news_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title_ar      text not null,
  title_en      text,
  excerpt_ar    text,
  excerpt_en    text,
  body_ar       text,
  body_en       text,
  cover_url     text,
  is_published  boolean not null default false,
  published_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index news_posts_published_idx on public.news_posts (published_at desc) where is_published;
create index news_posts_creator_idx on public.news_posts (created_by);
create trigger news_posts_updated_at before update on public.news_posts
  for each row execute function private.set_updated_at();

create table public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references public.events (id) on delete set null,
  kind        text not null default 'image' check (kind in ('image', 'video')),
  media_url   text not null,
  caption_ar  text,
  caption_en  text,
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);
create index gallery_items_event_idx on public.gallery_items (event_id);
create index gallery_items_visible_idx on public.gallery_items (sort_order) where is_visible;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
