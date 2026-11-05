-- =====================================================================
-- Test: Announcement Notifications Lifecycle & Deduplication Verification
-- Path: supabase/tests/announcement_notifications_test.sql
-- 
-- Verifies:
-- 1. Immediate publish upon insert -> dispatches notifications to active members.
-- 2. Draft insert (published_at is null) -> dispatches 0 notifications.
-- 3. Draft edits (title/body changes, published_at remains null) -> dispatches 0 notifications.
-- 4. Publishing existing draft (published_at updated to now()) -> dispatches notifications.
-- 5. Scheduled announcement insert (published_at > now()) -> dispatches 0 notifications.
-- 6. Edits to scheduled announcement -> dispatches 0 notifications.
-- 7. Scheduled publish execution (publish_scheduled_announcements()) -> dispatches notifications when time arrives.
-- 8. Repeated execution & idempotency -> prevents duplicate notifications across repeated runs.
--
-- Transactional & Safe: Runs in a transaction and ALWAYS rolls back at the end.
-- =====================================================================

begin;

create temp table if not exists announcement_test_results (
  id serial primary key,
  test_name text not null,
  expected text not null,
  actual text not null,
  status text not null
);

create or replace function pg_temp.record_result(
  p_name text,
  p_expected text,
  p_actual text
) returns void language plpgsql security definer as $$
begin
  insert into announcement_test_results (test_name, expected, actual, status)
  values (
    p_name,
    p_expected,
    p_actual,
    case when p_expected = p_actual then 'PASS' else 'FAIL' end
  );
end;
$$;

-- Setup test users
create or replace function pg_temp.setup_user(
  p_id uuid,
  p_email text,
  p_name text,
  p_role text
) returns void language plpgsql security definer as $$
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values (p_id, 'authenticated', 'authenticated', p_email, jsonb_build_object('full_name_ar', p_name))
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name_ar, full_name_en)
  values (p_id, p_name, 'Test User')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (p_id, p_role)
  on conflict (user_id, role) do nothing;
end;
$$;

do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-0000000000a1';
  v_member1_id uuid := '00000000-0000-0000-0000-0000000000b1';
  v_member2_id uuid := '00000000-0000-0000-0000-0000000000b2';
  v_comm_member_id uuid := '00000000-0000-0000-0000-0000000000c1';

  v_season_id uuid;
  v_comm_tech_id uuid;
  v_comm_hr_id uuid;

  v_imm_announcement_id uuid;
  v_draft_announcement_id uuid;
  v_sched_announcement_id uuid;
  v_notif_count int;
  v_cron_res json;
begin
  -- 1. Setup Fixtures
  perform pg_temp.setup_user(v_admin_id, 'admin_announce@test.local', 'رئيس الفريق', 'president');
  perform pg_temp.setup_user(v_member1_id, 'member1_announce@test.local', 'عضو أول', 'member');
  perform pg_temp.setup_user(v_member2_id, 'member2_announce@test.local', 'عضو ثاني', 'member');
  perform pg_temp.setup_user(v_comm_member_id, 'tech_member@test.local', 'عضو تقني', 'member');

  -- Active season
  insert into public.seasons (name, start_date, is_active)
  values ('موسم اختبار الإعلانات 2026', current_date - interval '10 days', true)
  returning id into v_season_id;

  -- Committees
  insert into public.committees (name_ar, name_en, slug, color)
  values ('لجنة التكنولوجيا', 'Technology Committee', 'tech_announce', '#2563eb')
  returning id into v_comm_tech_id;

  insert into public.committees (name_ar, name_en, slug, color)
  values ('لجنة الموارد البشرية', 'HR Committee', 'hr_announce', '#10b981')
  returning id into v_comm_hr_id;

  -- Memberships in active season
  insert into public.memberships (season_id, user_id, committee_id, status)
  values
    (v_season_id, v_member1_id, v_comm_hr_id, 'active'),
    (v_season_id, v_member2_id, v_comm_hr_id, 'active'),
    (v_season_id, v_comm_member_id, v_comm_tech_id, 'active');

  -- Clear any pre-existing notifications for test users
  delete from public.notifications where user_id in (v_admin_id, v_member1_id, v_member2_id, v_comm_member_id);

  -- ===================================================================
  -- TEST 1: Immediate Publish upon INSERT
  -- ===================================================================
  insert into public.announcements (
    season_id,
    committee_id,
    title,
    body,
    pinned,
    created_by,
    published_at
  ) values (
    v_season_id,
    null, -- General announcement
    'ترحيب بالموسم الجديد',
    'أهلاً بجميع أعضاء الفريق في بداية الموسم التدريبي والعملي!',
    true,
    v_admin_id,
    now()
  ) returning id into v_imm_announcement_id;

  -- Active members (member1, member2, comm_member) should be notified. Admin (creator) should not.
  select count(*) into v_notif_count
  from public.notifications
  where type = 'announcement'
    and data->>'announcement_id' = v_imm_announcement_id::text;

  perform pg_temp.record_result(
    '1. Immediate Publish generates notifications for all active members',
    '3',
    v_notif_count::text
  );

  -- Creator was excluded
  select count(*) into v_notif_count
  from public.notifications
  where user_id = v_admin_id
    and data->>'announcement_id' = v_imm_announcement_id::text;

  perform pg_temp.record_result(
    '1b. Creator excluded from self-notification',
    '0',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 2: Draft INSERT (published_at is null)
  -- ===================================================================
  insert into public.announcements (
    season_id,
    committee_id,
    title,
    body,
    pinned,
    created_by,
    published_at
  ) values (
    v_season_id,
    null,
    'مسودة إعلان داخلي',
    'هذا الإعلان لا يزال قيد المراجعة ولم يتم اعتماده للنشر.',
    false,
    v_admin_id,
    null -- Draft
  ) returning id into v_draft_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_draft_announcement_id::text;

  perform pg_temp.record_result(
    '2. Draft insert dispatches 0 notifications',
    '0',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 3: Edits to Drafts (published_at remains null)
  -- ===================================================================
  update public.announcements
  set title = 'مسودة إعلان داخلي - معدلة',
      body = 'تم تعديل نص المسودة وما زالت غير منشورة.'
  where id = v_draft_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_draft_announcement_id::text;

  perform pg_temp.record_result(
    '3. Edits to draft dispatch 0 notifications',
    '0',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 4: Publishing an Existing Draft (published_at updated to now())
  -- ===================================================================
  update public.announcements
  set published_at = now()
  where id = v_draft_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_draft_announcement_id::text;

  perform pg_temp.record_result(
    '4. Publishing existing draft triggers fan-out notifications',
    '3',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 5: Scheduled Announcement INSERT (published_at in future)
  -- ===================================================================
  insert into public.announcements (
    season_id,
    committee_id,
    title,
    body,
    pinned,
    created_by,
    published_at
  ) values (
    v_season_id,
    v_comm_tech_id, -- Committee-specific
    'ورشة عمل تقنية قادمة',
    'ورشة عمل مخصصة للجنة التكنولوجيا ستبدأ قريباً.',
    false,
    v_admin_id,
    now() + interval '2 hours' -- Scheduled
  ) returning id into v_sched_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  perform pg_temp.record_result(
    '5. Scheduled announcement insert dispatches 0 notifications immediately',
    '0',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 6: Edits to Scheduled Announcement (still future)
  -- ===================================================================
  update public.announcements
  set title = 'ورشة عمل تقنية قادمة - تحديث الموعد',
      published_at = now() + interval '3 hours'
  where id = v_sched_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  perform pg_temp.record_result(
    '6. Rescheduling/editing future announcement dispatches 0 notifications',
    '0',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 7: Scheduled Announcement Reaches Publication Time
  -- (Simulate wall-clock passage by setting published_at to past without trigger)
  -- ===================================================================
  -- Temporarily alter published_at to past
  update public.announcements
  set published_at = now() - interval '2 minutes'
  where id = v_sched_announcement_id;

  -- Clear notifications if any were somehow generated, then test routine
  delete from public.notifications where data->>'announcement_id' = v_sched_announcement_id::text;

  -- Run the scheduled routine
  v_cron_res := private.publish_scheduled_announcements();

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  -- Committee-specific: only v_comm_member_id belongs to v_comm_tech_id
  perform pg_temp.record_result(
    '7. Scheduled routine notifies target committee member',
    '1',
    v_notif_count::text
  );

  -- ===================================================================
  -- TEST 8: Repeated Execution & Deduplication (Idempotency)
  -- ===================================================================
  -- Run scheduled routine a second time
  v_cron_res := private.publish_scheduled_announcements();

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  perform pg_temp.record_result(
    '8a. Second run of scheduled routine does NOT create duplicate notifications',
    '1',
    v_notif_count::text
  );

  -- Edit title/body of the now published announcement
  update public.announcements
  set title = 'ورشة عمل تقنية قادمة - تعديل إملائي',
      body = 'تم تصحيح خطأ إملائي بسيط.'
  where id = v_sched_announcement_id;

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  perform pg_temp.record_result(
    '8b. Editing an already-published announcement does NOT duplicate notifications',
    '1',
    v_notif_count::text
  );

  -- Direct repeated call to fan-out helper
  perform private.fan_out_announcement_notifications(v_sched_announcement_id);

  select count(*) into v_notif_count
  from public.notifications
  where data->>'announcement_id' = v_sched_announcement_id::text;

  perform pg_temp.record_result(
    '8c. Direct re-invocation of fan_out is completely idempotent',
    '1',
    v_notif_count::text
  );

end $$;

-- Output test results summary
select id, test_name, expected, actual, status
from announcement_test_results
order by id;

-- Verification check: abort with non-zero SQL error if any test recorded FAIL
do $$
declare
  v_fail_count int;
  v_fail_summary text;
begin
  select count(*),
         string_agg(format('[%s]: expected %s, got %s', test_name, expected, actual), E'\n  ')
  into v_fail_count, v_fail_summary
  from announcement_test_results
  where status = 'FAIL';

  if v_fail_count > 0 then
    raise exception 'Announcement Notifications Test FAILED with % failure(s):%  %', v_fail_count, E'\n', v_fail_summary;
  end if;

  raise notice 'Announcement Notifications Test PASSED: all checks succeeded.';
end $$;

rollback;

