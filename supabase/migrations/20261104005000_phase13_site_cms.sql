-- =====================================================================
-- 0013 PHASE 13: SITE CMS & SITE ASSETS BUCKET
-- Public bucket 'site-assets' with 5MB limit, image mimes only,
-- and dedicated RLS policies for site management roles.
-- =====================================================================

-- 1. Create 'site-assets' bucket in storage.buckets if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

-- 2. Storage Policies for 'site-assets'

-- Public Read: anyone can read site assets
create policy site_assets_select on storage.objects
  for select to public
  using (bucket_id = 'site-assets');

-- Insert Policy: Staff roles (media_admin, pr_admin, hr_admin, president, vice_president)
create policy site_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-assets'
    and (select private.can(array['media_admin', 'pr_admin', 'hr_admin', 'president', 'vice_president']))
  );

-- Update Policy: Staff roles
create policy site_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-assets'
    and (select private.can(array['media_admin', 'pr_admin', 'hr_admin', 'president', 'vice_president']))
  )
  with check (
    bucket_id = 'site-assets'
    and (select private.can(array['media_admin', 'pr_admin', 'hr_admin', 'president', 'vice_president']))
  );

-- Delete Policy: Staff roles
create policy site_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-assets'
    and (select private.can(array['media_admin', 'pr_admin', 'hr_admin', 'president', 'vice_president']))
  );

