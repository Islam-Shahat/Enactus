-- =====================================================================
-- 0005 ROW LEVEL SECURITY + GRANTS
-- Rule of thumb used below:
--   private.can(array[...])  -> has one of these roles (super_admin always passes)
--   private.is_head_of(c)    -> head of committee c
--   private.is_member_of(c)  -> active member of committee c this season
-- Everything is wrapped in (select ...) so Postgres evaluates it once per
-- statement instead of once per row where possible.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extra helpers
-- ---------------------------------------------------------------------
create or replace function private.in_committee_slug(_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.committees c on c.id = m.committee_id
    join public.seasons s on s.id = m.season_id and s.is_active
    where m.user_id = (select auth.uid()) and m.status = 'active' and c.slug = _slug
  );
$$;

create or replace function private.can_manage_event(_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can(array['oc_admin', 'president', 'vice_president'])
      or exists (
        select 1 from public.events e
        where e.id = _event and private.is_head_of(e.organizing_committee_id)
      );
$$;

grant execute on function private.in_committee_slug(text), private.can_manage_event(uuid)
  to authenticated, service_role;

-- Every new session gets a QR secret (readable only by the service role)
create or replace function private.create_session_secret()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.session_secrets (session_id) values (new.id);
  return null;
end;
$$;
create trigger attendance_sessions_secret after insert on public.attendance_sessions
  for each row execute function private.create_session_secret();

-- =====================================================================
-- CORE
-- =====================================================================
-- profiles
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id or (select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select auth.uid()) = id or (select private.can(array['hr_admin', 'president', 'vice_president'])));

-- profile_private
create policy profile_private_select on public.profile_private for select to authenticated
  using ((select auth.uid()) = user_id
         or (select private.can(array['hr_admin', 'president', 'vice_president']))
         or (select private.is_head_of_user(user_id)));
create policy profile_private_update on public.profile_private for update to authenticated
  using ((select auth.uid()) = user_id or (select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select auth.uid()) = user_id or (select private.can(array['hr_admin', 'president', 'vice_president'])));

-- seasons
create policy seasons_select on public.seasons for select to authenticated using (true);
create policy seasons_write on public.seasons for all to authenticated
  using ((select private.can(array['president']))) with check ((select private.can(array['president'])));

-- committees (public ones are visible to the website)
create policy committees_select_anon on public.committees for select to anon using (is_public);
create policy committees_select_auth on public.committees for select to authenticated using (true);
create policy committees_write on public.committees for all to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin'])))
  with check ((select private.can(array['president', 'vice_president', 'hr_admin'])));

-- user_roles: only super_admin can grant/revoke roles
create policy user_roles_select on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id or (select private.can(array['president', 'vice_president', 'hr_admin'])));
create policy user_roles_write on public.user_roles for all to authenticated
  using ((select private.can(array[]::text[]))) with check ((select private.can(array[]::text[])));

-- memberships
create policy memberships_select on public.memberships for select to authenticated using (true);
create policy memberships_write on public.memberships for all to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));

-- settings
create policy settings_select_anon on public.settings for select to anon using (is_public);
create policy settings_select_auth on public.settings for select to authenticated
  using (is_public or (select private.is_staff()));
create policy settings_insert on public.settings for insert to authenticated
  with check ((select private.can(array['president'])));
create policy settings_update on public.settings for update to authenticated
  using ((select private.can(array['president'])) or (key = 'applications_open' and (select private.can(array['hr_admin']))))
  with check ((select private.can(array['president'])) or (key = 'applications_open' and (select private.can(array['hr_admin']))));
create policy settings_delete on public.settings for delete to authenticated
  using ((select private.can(array['president'])));

-- audit_logs: read-only for leadership; rows are written by trigger
create policy audit_logs_select on public.audit_logs for select to authenticated
  using ((select private.can(array['president'])));

-- =====================================================================
-- PEOPLE & OPERATIONS
-- =====================================================================
-- applications: created by Edge Function only
create policy applications_select on public.applications for select to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president']))
         or (select private.is_head_of(first_choice_id))
         or (select private.is_head_of(second_choice_id)));
create policy applications_update on public.applications for update to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));
create policy applications_delete on public.applications for delete to authenticated
  using ((select private.can(array[]::text[])));

-- tasks
create policy tasks_select on public.tasks for select to authenticated
  using (assignee_id = (select auth.uid())
         or created_by = (select auth.uid())
         or (select private.is_member_of(committee_id))
         or (select private.is_head_of(committee_id))
         or (select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator'])));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (created_by = (select auth.uid())
              and ((select private.is_head_of(committee_id))
                   or (select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator']))));
create policy tasks_update on public.tasks for update to authenticated
  using (assignee_id = (select auth.uid())
         or created_by = (select auth.uid())
         or (select private.is_head_of(committee_id))
         or (select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator'])))
  with check (assignee_id = (select auth.uid())
         or created_by = (select auth.uid())
         or (select private.is_head_of(committee_id))
         or (select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator'])));
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select private.is_head_of(committee_id))
         or (select private.can(array['president', 'vice_president', 'hr_admin'])));

-- task_comments / task_attachments follow task visibility (tasks RLS applies inside EXISTS)
create policy task_comments_select on public.task_comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy task_comments_update on public.task_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy task_comments_delete on public.task_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.can(array['president', 'vice_president', 'hr_admin'])));

create policy task_attachments_select on public.task_attachments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy task_attachments_insert on public.task_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy task_attachments_delete on public.task_attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()) or (select private.can(array['president', 'vice_president', 'hr_admin'])));

-- attendance_sessions
create policy attendance_sessions_select on public.attendance_sessions for select to authenticated
  using (committee_id is null
         or (select private.is_member_of(committee_id))
         or (select private.is_head_of(committee_id))
         or (select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator'])));
create policy attendance_sessions_write on public.attendance_sessions for all to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator']))
         or (select private.is_head_of(committee_id)))
  with check ((select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator']))
         or (select private.is_head_of(committee_id)));
-- session_secrets: RLS on, deliberately NO policies (service role only)

-- attendance
create policy attendance_select on public.attendance for select to authenticated
  using (user_id = (select auth.uid())
         or (select private.can(array['president', 'vice_president', 'hr_admin', 'oc_admin', 'coordinator']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))));
create policy attendance_write on public.attendance for all to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))))
  with check ((select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))));

-- excuse_requests
create policy excuse_requests_select on public.excuse_requests for select to authenticated
  using (user_id = (select auth.uid())
         or (select private.can(array['president', 'vice_president', 'hr_admin']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))));
create policy excuse_requests_insert on public.excuse_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null);
create policy excuse_requests_update on public.excuse_requests for update to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))))
  with check ((select private.can(array['president', 'vice_president', 'hr_admin']))
         or exists (select 1 from public.attendance_sessions s
                    where s.id = session_id and (select private.is_head_of(s.committee_id))));
create policy excuse_requests_delete on public.excuse_requests for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- points
create policy point_rules_select on public.point_rules for select to authenticated using (true);
create policy point_rules_write on public.point_rules for all to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));

create policy point_entries_select on public.point_entries for select to authenticated
  using (user_id = (select auth.uid())
         or (select private.can(array['hr_admin', 'president', 'vice_president']))
         or (select private.is_head_of_user(user_id)));
create policy point_entries_insert on public.point_entries for insert to authenticated
  with check (given_by = (select auth.uid()) and voided_at is null
              and ((select private.can(array['hr_admin', 'president', 'vice_president']))
                   or (select private.is_head_of_user(user_id))));
create policy point_entries_void on public.point_entries for update to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));

create policy member_scores_select on public.member_scores for select to authenticated using (true);

create policy point_disputes_select on public.point_disputes for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can(array['hr_admin', 'president', 'vice_president'])));
create policy point_disputes_insert on public.point_disputes for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
              and exists (select 1 from public.point_entries e
                          where e.id = point_entry_id and e.user_id = (select auth.uid())));
create policy point_disputes_update on public.point_disputes for update to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));

-- evaluations
create policy evaluations_select on public.evaluations for select to authenticated
  using (evaluator_id = (select auth.uid())
         or (member_id = (select auth.uid()) and visible_to_member)
         or (select private.can(array['hr_admin', 'president', 'vice_president'])));
create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (evaluator_id = (select auth.uid())
              and ((select private.can(array['hr_admin', 'president', 'vice_president']))
                   or (select private.is_head_of_user(member_id))));
create policy evaluations_update on public.evaluations for update to authenticated
  using (evaluator_id = (select auth.uid())) with check (evaluator_id = (select auth.uid()));
create policy evaluations_delete on public.evaluations for delete to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])));

-- announcements
create policy announcements_select on public.announcements for select to authenticated
  using ((published_at <= now()
          and (expires_at is null or expires_at > now())
          and (committee_id is null
               or (select private.is_member_of(committee_id))
               or (select private.is_head_of(committee_id))))
         or (select private.can(array['president', 'vice_president', 'hr_admin'])));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (created_by = (select auth.uid())
              and ((select private.can(array['president', 'vice_president', 'hr_admin']))
                   or (committee_id is not null and (select private.is_head_of(committee_id)))));
create policy announcements_update on public.announcements for update to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin']))
         or (committee_id is not null and (select private.is_head_of(committee_id))))
  with check ((select private.can(array['president', 'vice_president', 'hr_admin']))
         or (committee_id is not null and (select private.is_head_of(committee_id))));
create policy announcements_delete on public.announcements for delete to authenticated
  using ((select private.can(array['president', 'vice_president', 'hr_admin']))
         or (committee_id is not null and (select private.is_head_of(committee_id))));

-- notifications: inserted by triggers / Edge Functions, owner can read & mark read
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- BUSINESS
-- =====================================================================
create policy companies_select on public.companies for select to authenticated
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president', 'media_admin', 'oc_admin']))
         or (select private.in_committee_slug('media')));
create policy companies_write on public.companies for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));

create policy company_contacts_all on public.company_contacts for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy company_notes_all on public.company_notes for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));

create policy packages_select_anon on public.sponsorship_packages for select to anon
  using (is_public and is_active);
create policy packages_select_auth on public.sponsorship_packages for select to authenticated
  using ((is_public and is_active)
         or (select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president'])));
create policy packages_write on public.sponsorship_packages for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));

-- agreements (contain money: media never sees them)
create policy agreements_select on public.agreements for select to authenticated
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president'])));
create policy agreements_insert on public.agreements for insert to authenticated
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy agreements_update on public.agreements for update to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy agreements_delete on public.agreements for delete to authenticated
  using ((select private.can(array['president'])));

-- payments: PR can record, finance/leadership confirm & edit, only super_admin deletes
create policy payments_select on public.payments for select to authenticated
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president'])));
create policy payments_insert on public.payments for insert to authenticated
  with check (recorded_by = (select auth.uid())
              and (select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president'])));
create policy payments_update on public.payments for update to authenticated
  using ((select private.can(array['finance_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['finance_admin', 'president', 'vice_president'])));
create policy payments_delete on public.payments for delete to authenticated
  using ((select private.can(array[]::text[])));

-- deliverables
create policy deliverables_select on public.deliverables for select to authenticated
  using ((select private.can(array['pr_admin', 'finance_admin', 'president', 'vice_president', 'media_admin']))
         or (select private.in_committee_slug('media')));
create policy deliverables_write on public.deliverables for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));

-- posts
create policy posts_select on public.posts for select to authenticated
  using (created_by = (select auth.uid())
         or (select private.is_member_of(committee_id))
         or (select private.is_head_of(committee_id))
         or (select private.in_committee_slug('media'))
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])));
create policy posts_insert on public.posts for insert to authenticated
  with check (created_by = (select auth.uid())
              and ((select private.in_committee_slug('media'))
                   or (select private.is_member_of(committee_id))
                   or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])))
              and (status in ('draft', 'review')
                   or (select private.can(array['media_admin', 'president', 'vice_president']))));
create policy posts_update on public.posts for update to authenticated
  using ((created_by = (select auth.uid()) and status in ('draft', 'review'))
         or (select private.is_head_of(committee_id))
         or (select private.can(array['media_admin', 'president', 'vice_president'])))
  with check ((created_by = (select auth.uid()) and status in ('draft', 'review'))
         or (select private.is_head_of(committee_id))
         or (select private.can(array['media_admin', 'president', 'vice_president'])));
create policy posts_delete on public.posts for delete to authenticated
  using ((created_by = (select auth.uid()) and status = 'draft')
         or (select private.can(array['media_admin', 'president'])));

create policy post_deliverables_select on public.post_deliverables for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_deliverables_write on public.post_deliverables for all to authenticated
  using ((select private.in_committee_slug('media'))
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])))
  with check ((select private.in_committee_slug('media'))
         or (select private.can(array['media_admin', 'pr_admin', 'president', 'vice_president'])));

-- expenses & budgets
create policy expenses_select on public.expenses for select to authenticated
  using (requested_by = (select auth.uid())
         or (select private.is_head_of(committee_id))
         or (select private.can(array['finance_admin', 'president', 'vice_president'])));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending'
              and ((select private.is_head_of(committee_id))
                   or (select private.can(array['finance_admin', 'president', 'vice_president', 'oc_admin']))));
create policy expenses_update on public.expenses for update to authenticated
  using ((requested_by = (select auth.uid()) and status = 'pending')
         or (select private.can(array['finance_admin', 'president', 'vice_president'])))
  with check ((requested_by = (select auth.uid()) and status = 'pending')
         or (select private.can(array['finance_admin', 'president', 'vice_president'])));
create policy expenses_delete on public.expenses for delete to authenticated
  using ((select private.can(array[]::text[])));

create policy budgets_select on public.budgets for select to authenticated
  using ((select private.is_head_of(committee_id))
         or (select private.can(array['finance_admin', 'president', 'vice_president'])));
create policy budgets_write on public.budgets for all to authenticated
  using ((select private.can(array['finance_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['finance_admin', 'president', 'vice_president'])));

-- =====================================================================
-- EVENTS
-- =====================================================================
create policy events_select_anon on public.events for select to anon
  using (is_public and status in ('published', 'ongoing', 'completed'));
create policy events_select_auth on public.events for select to authenticated
  using ((is_public and status in ('published', 'ongoing', 'completed'))
         or (select private.can(array['oc_admin', 'president', 'vice_president', 'hr_admin', 'pr_admin', 'media_admin', 'coordinator']))
         or (select private.is_head_of(organizing_committee_id))
         or (select private.is_member_of(organizing_committee_id)));
create policy events_write on public.events for all to authenticated
  using ((select private.can(array['oc_admin', 'president', 'vice_president']))
         or (select private.is_head_of(organizing_committee_id)))
  with check ((select private.can(array['oc_admin', 'president', 'vice_president']))
         or (select private.is_head_of(organizing_committee_id)));

create policy event_roles_select on public.event_roles for select to authenticated using (true);
create policy event_roles_write on public.event_roles for all to authenticated
  using ((select private.can_manage_event(event_id))) with check ((select private.can_manage_event(event_id)));

create policy event_volunteers_select on public.event_volunteers for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_event(event_id)));
create policy event_volunteers_insert on public.event_volunteers for insert to authenticated
  with check ((user_id = (select auth.uid()) and status = 'requested') or (select private.can_manage_event(event_id)));
create policy event_volunteers_update on public.event_volunteers for update to authenticated
  using ((select private.can_manage_event(event_id))) with check ((select private.can_manage_event(event_id)));
create policy event_volunteers_delete on public.event_volunteers for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_event(event_id)));

-- event_registrations / event_feedback: rows are created by Edge Functions
create policy event_registrations_select on public.event_registrations for select to authenticated
  using ((select private.can_manage_event(event_id)));
create policy event_registrations_update on public.event_registrations for update to authenticated
  using ((select private.can_manage_event(event_id))) with check ((select private.can_manage_event(event_id)));
create policy event_registrations_delete on public.event_registrations for delete to authenticated
  using ((select private.can_manage_event(event_id)));
create policy event_feedback_select on public.event_feedback for select to authenticated
  using ((select private.can_manage_event(event_id)));

create policy event_sponsors_select_anon on public.event_sponsors for select to anon
  using (exists (select 1 from public.events e where e.id = event_id));
create policy event_sponsors_select_auth on public.event_sponsors for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy event_sponsors_write on public.event_sponsors for all to authenticated
  using ((select private.can(array['pr_admin']) ) or (select private.can_manage_event(event_id)))
  with check ((select private.can(array['pr_admin'])) or (select private.can_manage_event(event_id)));

-- =====================================================================
-- PUBLIC SITE CONTENT
-- =====================================================================
create policy partners_select_anon on public.partners for select to anon using (is_visible);
create policy partners_select_auth on public.partners for select to authenticated
  using (is_visible or (select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy partners_write on public.partners for all to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));

create policy team_public_select_anon on public.team_public for select to anon using (is_visible);
create policy team_public_select_auth on public.team_public for select to authenticated
  using (is_visible or (select private.can(array['hr_admin', 'president', 'vice_president'])));
create policy team_public_write on public.team_public for all to authenticated
  using ((select private.can(array['hr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['hr_admin', 'president', 'vice_president'])));

create policy site_stats_select_anon on public.site_stats for select to anon using (is_visible);
create policy site_stats_select_auth on public.site_stats for select to authenticated
  using (is_visible or (select private.can(array['media_admin', 'president', 'vice_president'])));
create policy site_stats_write on public.site_stats for all to authenticated
  using ((select private.can(array['media_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['media_admin', 'president', 'vice_president'])));

create policy site_content_select_anon on public.site_content for select to anon using (true);
create policy site_content_select_auth on public.site_content for select to authenticated using (true);
create policy site_content_write on public.site_content for all to authenticated
  using ((select private.can(array['media_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['media_admin', 'president', 'vice_president'])));

create policy news_posts_select_anon on public.news_posts for select to anon
  using (is_published and published_at <= now());
create policy news_posts_select_auth on public.news_posts for select to authenticated
  using ((is_published and published_at <= now())
         or (select private.can(array['media_admin', 'president', 'vice_president'])));
create policy news_posts_write on public.news_posts for all to authenticated
  using ((select private.can(array['media_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['media_admin', 'president', 'vice_president'])));

create policy gallery_items_select_anon on public.gallery_items for select to anon using (is_visible);
create policy gallery_items_select_auth on public.gallery_items for select to authenticated
  using (is_visible or (select private.can(array['media_admin', 'president', 'vice_president'])));
create policy gallery_items_write on public.gallery_items for all to authenticated
  using ((select private.can(array['media_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['media_admin', 'president', 'vice_president'])));

-- =====================================================================
-- GRANTS (Data API exposure). RLS decides rows; grants decide tables.
-- =====================================================================
grant usage on schema public to anon, authenticated;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- anonymous website visitors: read-only, public tables only
grant select on
  public.committees, public.events, public.event_sponsors, public.sponsorship_packages,
  public.partners, public.team_public, public.site_stats, public.site_content,
  public.news_posts, public.gallery_items, public.settings
to anon;

-- signed-in users: full DML, narrowed by RLS and by the exceptions below
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on public.session_secrets from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.member_scores from authenticated;
revoke delete on public.point_entries from authenticated;
revoke insert on public.applications, public.event_registrations, public.event_feedback, public.notifications
  from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
