-- =====================================================================
-- 20261103233000 PHASE 5 PUBLIC FORMS BACKEND SUPPORT
-- Unique constraints, IP hash rate-limiting columns, and indexes for
-- recruitment applications and contact messages.
-- =====================================================================

-- 1. applications: add ip_hash column for server-side rate limiting
alter table public.applications
  add column if not exists ip_hash text;

-- 2. applications: unique per active season and lowercase email
-- Deduplication: Prevents double submission within the same season.
create unique index if not exists applications_season_lower_email_idx
  on public.applications (season_id, lower(email));

-- 3. applications: rate-limiting lookup index on (ip_hash, created_at)
create index if not exists applications_ip_hash_created_at_idx
  on public.applications (ip_hash, created_at);

-- 4. contact_messages: rate-limiting lookup index on (ip_hash, created_at)
create index if not exists contact_messages_ip_hash_created_at_idx
  on public.contact_messages (ip_hash, created_at);

