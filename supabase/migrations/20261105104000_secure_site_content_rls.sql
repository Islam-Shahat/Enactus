-- =====================================================================
-- 20261105104000: SECURE SITE CONTENT & CMS PUBLIC READ POLICIES
--
-- Audit finding:
-- 1. public.site_content had "site_content_select_anon" with "using (true)",
--    allowing unauthenticated callers to read ALL content, including drafts,
--    internal notes, unreleased pages, or sensitive metadata.
-- 2. site_content lacked an explicit visibility/public flag (unlike all
--    other CMS tables such as settings, faqs, partners, news_posts).
--
-- Fix:
-- 1. Add "is_public boolean not null default true" to public.site_content.
-- 2. Add index on site_content(is_public).
-- 3. Replace site_content_select_anon so anon can ONLY read is_public = true.
-- 4. Replace site_content_select_auth so regular authenticated users can only
--    read is_public = true, while authorized staff (media_admin, president,
--    vice_president, or super_admin) can read both public and private/draft content.
-- 5. Harden event_sponsors_select_anon to explicitly verify the associated
--    event is public and published/ongoing/completed.
-- =====================================================================

-- 1. Alter site_content to add is_public flag if not exists
alter table public.site_content
  add column if not exists is_public boolean not null default true;

-- 2. Add index for query performance
create index if not exists site_content_is_public_idx on public.site_content (is_public);

-- 3. Replace site_content_select_anon
drop policy if exists site_content_select_anon on public.site_content;

create policy site_content_select_anon on public.site_content
  for select to anon
  using (
    is_public = true
    and (value->>'is_public' is null or (value->>'is_public')::boolean = true)
  );

-- 4. Replace site_content_select_auth
drop policy if exists site_content_select_auth on public.site_content;

create policy site_content_select_auth on public.site_content
  for select to authenticated
  using (
    (is_public = true and (value->>'is_public' is null or (value->>'is_public')::boolean = true))
    or (select private.can(array['media_admin', 'president', 'vice_president']))
  );

-- 5. Explicitly reaffirm grants
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon;
grant select, insert, update, delete on public.site_content to authenticated;

-- 6. Harden event_sponsors anon read policy
drop policy if exists event_sponsors_select_anon on public.event_sponsors;

create policy event_sponsors_select_anon on public.event_sponsors
  for select to anon
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.is_public = true
        and e.status in ('published', 'ongoing', 'completed')
    )
  );

