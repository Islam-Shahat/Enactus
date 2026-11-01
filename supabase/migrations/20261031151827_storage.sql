-- =====================================================================
-- 0006 STORAGE
-- Path convention: <bucket>/<owner-or-entity-id>/<filename>
--   avatars/<user_id>/...        public read, owner write
--   event-media/<event_id>/...   public read, media team write
--   receipts/<agreement_id>/...  private, finance/PR
--   contracts/<agreement_id>/... private, PR/leadership
--   task-files/<task_id>/...     private, anyone who can see the task
--   cvs/<application_id>/...     private, uploaded by Edge Function (service role)
-- Upsert needs INSERT + SELECT + UPDATE policies.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars',     'avatars',     true,  2097152),
  ('event-media', 'event-media', true,  10485760),
  ('receipts',    'receipts',    false, 5242880),
  ('contracts',   'contracts',   false, 10485760),
  ('task-files',  'task-files',  false, 10485760),
  ('cvs',         'cvs',         false, 5242880)
on conflict (id) do nothing;

-- avatars: public read (bucket is public); owner manages own folder
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- event-media: media team + leadership manage
create policy event_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media'
              and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
                   or (select private.in_committee_slug('media'))));
create policy event_media_select on storage.objects for select to authenticated
  using (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_committee_slug('media'))));
create policy event_media_update on storage.objects for update to authenticated
  using (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_committee_slug('media'))))
  with check (bucket_id = 'event-media'
         and ((select private.can(array['media_admin', 'oc_admin', 'president', 'vice_president']))
              or (select private.in_committee_slug('media'))));
create policy event_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and (select private.can(array['media_admin', 'president', 'vice_president'])));

-- receipts: finance and PR
create policy receipts_all on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (select private.can(array['finance_admin', 'pr_admin', 'president', 'vice_president'])))
  with check (bucket_id = 'receipts' and (select private.can(array['finance_admin', 'pr_admin', 'president', 'vice_president'])));

-- contracts: PR and leadership (finance can read)
create policy contracts_select on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and (select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president'])));
create policy contracts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and (select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy contracts_update on storage.objects for update to authenticated
  using (bucket_id = 'contracts' and (select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check (bucket_id = 'contracts' and (select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy contracts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and (select private.can(array['president'])));

-- task-files: anyone who can see the task (tasks RLS applies inside EXISTS)
create policy task_files_select on storage.objects for select to authenticated
  using (bucket_id = 'task-files'
         and exists (select 1 from public.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy task_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'task-files'
              and exists (select 1 from public.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy task_files_update on storage.objects for update to authenticated
  using (bucket_id = 'task-files' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'task-files' and owner_id = (select auth.uid())::text);
create policy task_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'task-files'
         and (owner_id = (select auth.uid())::text
              or (select private.can(array['president', 'vice_president', 'hr_admin']))));

-- cvs: uploaded by the Edge Function; HR/leadership read
create policy cvs_select on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (select private.can(array['hr_admin', 'president', 'vice_president'])));
