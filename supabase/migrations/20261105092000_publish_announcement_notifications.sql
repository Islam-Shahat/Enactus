-- Migration: 20261105092000_publish_announcement_notifications.sql
-- Description: Fix announcement notifications so they are generated when an existing draft
--              is published and when a scheduled announcement reaches its publication time.
--              Ensures duplicate-resistant notification delivery via dedupe keys and idempotent fan-out.

-- 1. Allow announcements to be saved as drafts (published_at is null)
alter table public.announcements alter column published_at drop not null;

-- 2. Index on published_at to accelerate scheduled announcement queries
create index if not exists announcements_published_at_idx
  on public.announcements (published_at)
  where published_at is not null;

-- 3. Dedicated Fan-out Helper for Announcement Notifications
create or replace function private.fan_out_announcement_notifications(p_announcement_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_announcement record;
  v_target_user uuid;
  v_short_body text;
  v_notified_count int := 0;
begin
  select id, season_id, committee_id, title, body, pinned, created_by, published_at, expires_at
  into v_announcement
  from public.announcements
  where id = p_announcement_id;

  if not found then
    return 0;
  end if;

  -- Only fan out if published_at is set, has been reached, and announcement has not expired
  if v_announcement.published_at is null or v_announcement.published_at > now() then
    return 0;
  end if;

  if v_announcement.expires_at is not null and v_announcement.expires_at <= now() then
    return 0;
  end if;

  v_short_body := substring(v_announcement.body from 1 for 150);

  if v_announcement.committee_id is null then
    -- General announcement: active members in the active season + leadership
    for v_target_user in (
      select distinct m.user_id
      from public.memberships m
      join public.seasons s on s.id = m.season_id and s.is_active = true
      where m.status = 'active'
        and (v_announcement.created_by is null or m.user_id is distinct from v_announcement.created_by)
      union
      select distinct ur.user_id
      from public.user_roles ur
      where ur.role in ('president', 'vice_president', 'hr_admin', 'super_admin')
        and (v_announcement.created_by is null or ur.user_id is distinct from v_announcement.created_by)
    ) loop
      perform private.create_notification(
        v_target_user,
        'announcement',
        'إعلان عام: ' || v_announcement.title,
        v_short_body,
        '/dashboard/announcements',
        jsonb_build_object('announcement_id', v_announcement.id, 'pinned', v_announcement.pinned),
        'announcement:' || v_announcement.id || ':' || v_target_user
      );
      v_notified_count := v_notified_count + 1;
    end loop;
  else
    -- Committee-specific announcement: active members in that committee + committee head
    for v_target_user in (
      select distinct m.user_id
      from public.memberships m
      join public.seasons s on s.id = m.season_id and s.is_active = true
      where m.committee_id = v_announcement.committee_id
        and m.status = 'active'
        and (v_announcement.created_by is null or m.user_id is distinct from v_announcement.created_by)
      union
      select distinct ur.user_id
      from public.user_roles ur
      where ur.committee_id = v_announcement.committee_id
        and ur.role = 'committee_head'
        and (v_announcement.created_by is null or ur.user_id is distinct from v_announcement.created_by)
    ) loop
      perform private.create_notification(
        v_target_user,
        'announcement',
        'إعلان لجنتك: ' || v_announcement.title,
        v_short_body,
        '/dashboard/announcements',
        jsonb_build_object('announcement_id', v_announcement.id, 'committee_id', v_announcement.committee_id),
        'announcement:' || v_announcement.id || ':' || v_target_user
      );
      v_notified_count := v_notified_count + 1;
    end loop;
  end if;

  return v_notified_count;
end;
$$;

revoke all on function private.fan_out_announcement_notifications(uuid) from public, anon, authenticated;

-- 4. Trigger Function: fires on immediate publication and when drafts/scheduled rows are published
create or replace function private.trg_notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Fan out only when published_at is reached and announcement is not expired
  if new.published_at is not null and new.published_at <= now()
     and (new.expires_at is null or new.expires_at > now()) then
    -- Only dispatch when:
    -- 1. Inserted already published
    -- 2. Updated from draft (old.published_at was null) or scheduled (old.published_at was in future)
    if (tg_op = 'INSERT') or (tg_op = 'UPDATE' and (old.published_at is null or old.published_at > now())) then
      perform private.fan_out_announcement_notifications(new.id);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.trg_notify_announcement_published() from public, anon, authenticated;

-- 5. Recreate trigger to listen to both INSERT and UPDATE of published_at/expires_at
drop trigger if exists trg_announcements_notify on public.announcements;
create trigger trg_announcements_notify
  after insert or update of published_at, expires_at, title, body, committee_id on public.announcements
  for each row execute function private.trg_notify_announcement_published();

-- 6. Scheduled Routine: Publish Scheduled Announcements whose publication time has arrived
create or replace function private.publish_scheduled_announcements()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rec record;
  v_total_announcements int := 0;
  v_total_notifications int := 0;
  v_notified int;
begin
  -- Scan for announcements where publication time has arrived and recipients have not been notified yet
  for v_rec in (
    select a.id, a.title
    from public.announcements a
    where a.published_at is not null
      and a.published_at <= now()
      and (a.expires_at is null or a.expires_at > now())
      and a.published_at >= now() - interval '7 days'
      and exists (
        select 1
        from (
          select m.user_id
          from public.memberships m
          join public.seasons s on s.id = m.season_id and s.is_active = true
          where m.status = 'active'
            and (a.committee_id is null or m.committee_id = a.committee_id)
            and (a.created_by is null or m.user_id is distinct from a.created_by)
          union
          select ur.user_id
          from public.user_roles ur
          where (
            (a.committee_id is null and ur.role in ('president', 'vice_president', 'hr_admin', 'super_admin'))
            or (a.committee_id is not null and ur.committee_id = a.committee_id and ur.role = 'committee_head')
          )
          and (a.created_by is null or ur.user_id is distinct from a.created_by)
        ) targets
        where not exists (
          select 1
          from public.notifications n
          where n.user_id = targets.user_id
            and n.dedupe_key = 'announcement:' || a.id || ':' || targets.user_id
        )
      )
  ) loop
    v_notified := private.fan_out_announcement_notifications(v_rec.id);
    v_total_announcements := v_total_announcements + 1;
    v_total_notifications := v_total_notifications + v_notified;
  end loop;

  insert into public.job_runs (job, ok, details)
  values (
    'publish_scheduled_announcements',
    true,
    jsonb_build_object(
      'announcements_processed', v_total_announcements,
      'notifications_sent', v_total_notifications,
      'executed_at', now()
    )
  );

  return json_build_object(
    'ok', true,
    'announcements_processed', v_total_announcements,
    'notifications_sent', v_total_notifications
  );
exception when others then
  insert into public.job_runs (job, ok, details)
  values (
    'publish_scheduled_announcements',
    false,
    jsonb_build_object('error', sqlerrm, 'executed_at', now())
  );
  return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke all on function private.publish_scheduled_announcements() from public, anon, authenticated;
grant execute on function private.publish_scheduled_announcements() to service_role;

-- 7. Register pg_cron schedule for periodic execution
do $$
begin
  create extension if not exists pg_cron with schema extensions;

  begin
    perform cron.unschedule('publish-scheduled-announcements');
  exception when others then null;
  end;

  -- Every minute: check for scheduled announcements reaching their publication time
  perform cron.schedule(
    'publish-scheduled-announcements',
    '* * * * *',
    'select private.publish_scheduled_announcements();'
  );
exception when others then
  raise notice 'pg_cron setup deferred (extension may require Supabase dashboard toggle): %', sqlerrm;
end $$;

