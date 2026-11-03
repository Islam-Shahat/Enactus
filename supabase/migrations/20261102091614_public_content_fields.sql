-- =====================================================================
-- 20261102091614 PUBLIC CONTENT FIELDS
-- Makes the database able to hold everything the current public website
-- shows (committee pages, events with schedules, news categories, board /
-- alumni details, sponsorship tiers, FAQ), and replaces the hardcoded
-- 'media' committee slug in RLS with an explicit flag.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Committees: short code, rich page content, media-team flag
-- content shape: { "ar": { "brief", "mascot", "duties":[], "skillsRequired":[],
--                          "skillsGained":[], "activeProjects":[], "quote" },
--                  "en": { same keys } }
-- ---------------------------------------------------------------------
alter table public.committees
  add column code text,
  add column content jsonb not null default '{}'::jsonb,
  add column is_media_team boolean not null default false;

-- ---------------------------------------------------------------------
-- Events: category, short brief, free-text time label, schedule, partner names
-- schedule shape: [ { "time_ar", "time_en", "activity_ar", "activity_en" } ]
-- ---------------------------------------------------------------------
alter table public.events
  add column category_ar   text,
  add column category_en   text,
  add column brief_ar      text,
  add column brief_en      text,
  add column time_label_ar text,
  add column time_label_en text,
  add column schedule      jsonb not null default '[]'::jsonb,
  add column partner_names jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- News: category
-- ---------------------------------------------------------------------
alter table public.news_posts
  add column category_ar text,
  add column category_en text;

-- ---------------------------------------------------------------------
-- Team / board / alumni: faculty, alumni career + quote
-- ---------------------------------------------------------------------
alter table public.team_public
  add column faculty_ar           text,
  add column faculty_en           text,
  add column current_position_ar  text,
  add column current_position_en  text,
  add column quote_ar             text,
  add column quote_en             text;

-- ---------------------------------------------------------------------
-- Sponsorship packages: public label instead of a price, badge, featured flag.
-- Real negotiated amounts live in agreements, never in the public packages.
-- ---------------------------------------------------------------------
alter table public.sponsorship_packages
  alter column price drop not null,
  add column tagline_ar  text,
  add column tagline_en  text,
  add column badge_ar    text,
  add column badge_en    text,
  add column is_featured boolean not null default false;

-- ---------------------------------------------------------------------
-- FAQ
-- ---------------------------------------------------------------------
create table public.faqs (
  id           uuid primary key default gen_random_uuid(),
  question_ar  text not null,
  question_en  text,
  answer_ar    text not null,
  answer_en    text,
  sort_order   int not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index faqs_visible_idx on public.faqs (sort_order) where is_visible;
create trigger faqs_updated_at before update on public.faqs
  for each row execute function private.set_updated_at();
alter table public.faqs enable row level security;

create policy faqs_select_anon on public.faqs for select to anon using (is_visible);
create policy faqs_select_auth on public.faqs for select to authenticated
  using (is_visible or (select private.can(array['media_admin', 'hr_admin', 'president', 'vice_president'])));
create policy faqs_write on public.faqs for all to authenticated
  using ((select private.can(array['media_admin', 'hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['media_admin', 'hr_admin', 'president', 'vice_president'])));

revoke all on public.faqs from anon, authenticated;
grant select on public.faqs to anon;
grant select, insert, update, delete on public.faqs to authenticated;

-- ---------------------------------------------------------------------
-- Media team: any committee flagged is_media_team (Multimedia, Social Media...)
-- replaces the hardcoded slug 'media'.
-- ---------------------------------------------------------------------
create or replace function private.in_media_team()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.committees c on c.id = m.committee_id and c.is_media_team
    join public.seasons s on s.id = m.season_id and s.is_active
    where m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;
grant execute on function private.in_media_team() to authenticated, service_role;

alter policy companies_select on public.companies
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president', 'media_admin', 'oc_admin']))
         or (select private.in_media_team()));

alter policy deliverables_select on public.deliverables
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president', 'media_admin']))
         or (select private.in_media_team()));

alter policy posts_select on public.posts
  using (created_by = (select auth.uid())
         or (select private.is_member_of(committee_id))
         or (select private.is_head_of(committee_id))
         or (select private.in_media_team())
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])));

alter policy posts_insert on public.posts
  with check (created_by = (select auth.uid())
              and ((select private.in_media_team())
                   or (select private.is_member_of(committee_id))
                   or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])))
              and (status in ('draft', 'review')
                   or (select private.can(array['media_admin', 'president', 'vice_president']))));

alter policy post_deliverables_write on public.post_deliverables
  using ((select private.in_media_team())
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])))
  with check ((select private.in_media_team())
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])));

alter policy event_media_insert on storage.objects
  with check (bucket_id = 'event-media'
              and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
                   or (select private.in_media_team())));
alter policy event_media_select on storage.objects
  using (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_media_team())));
alter policy event_media_update on storage.objects
  using (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_media_team())))
  with check (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_media_team())));
