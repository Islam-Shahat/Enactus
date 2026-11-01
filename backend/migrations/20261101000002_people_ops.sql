-- =====================================================================
-- 0002 PEOPLE & OPERATIONS
-- Applications, tasks, attendance, points, evaluations, announcements,
-- notifications.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Recruitment. Rows are created ONLY by an Edge Function (CAPTCHA + rate limit).
-- ---------------------------------------------------------------------
create table public.applications (
  id                       uuid primary key default gen_random_uuid(),
  season_id                uuid not null references public.seasons (id) on delete cascade,
  full_name                text not null,
  email                    text not null,
  phone                    text,
  university_id            text,
  faculty                  text,
  study_year               smallint,
  first_choice_id          uuid references public.committees (id) on delete set null,
  second_choice_id         uuid references public.committees (id) on delete set null,
  motivation               text,
  answers                  jsonb not null default '{}'::jsonb,
  cv_url                   text,
  status                   text not null default 'new'
                           check (status in ('new', 'screening', 'interview', 'accepted', 'rejected', 'withdrawn')),
  interview_score          numeric(4, 1),
  notes                    text,
  reviewed_by              uuid references public.profiles (id) on delete set null,
  converted_user_id        uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index applications_season_status_idx on public.applications (season_id, status);
create index applications_first_choice_idx on public.applications (first_choice_id);
create index applications_second_choice_idx on public.applications (second_choice_id);
create index applications_reviewer_idx on public.applications (reviewed_by);
create trigger applications_updated_at before update on public.applications
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid not null references public.committees (id) on delete restrict,
  title         text not null,
  description   text,
  assignee_id   uuid references public.profiles (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null,
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  due_date      timestamptz,
  points_value  int not null default 0 check (points_value >= 0),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tasks_committee_status_idx on public.tasks (committee_id, status);
create index tasks_assignee_status_idx on public.tasks (assignee_id, status);
create index tasks_due_idx on public.tasks (due_date) where status not in ('done', 'cancelled');
create index tasks_season_idx on public.tasks (season_id);
create index tasks_creator_idx on public.tasks (created_by);

create table public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);
create index task_comments_author_idx on public.task_comments (author_id);

create table public.task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  file_path    text not null,
  file_name    text,
  created_at   timestamptz not null default now()
);
create index task_attachments_task_idx on public.task_attachments (task_id);

-- Assignees may only change status; leaders may change everything.
create or replace function private.guard_task_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null
     and not (select private.can(array['president', 'vice_president', 'hr_admin', 'coordinator']))
     and not (select private.is_head_of(old.committee_id))
     and old.created_by is distinct from (select auth.uid()) then
    if (new.title, new.description, new.assignee_id, new.committee_id, new.season_id,
        new.priority, new.due_date, new.points_value, new.created_by)
       is distinct from
       (old.title, old.description, old.assignee_id, old.committee_id, old.season_id,
        old.priority, old.due_date, old.points_value, old.created_by) then
      raise exception 'Assignees may only change the task status';
    end if;
  end if;

  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;
create trigger tasks_guard before update on public.tasks
  for each row execute function private.guard_task_update();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Attendance. QR check-in is done by an Edge Function using the secret.
-- ---------------------------------------------------------------------
create table public.attendance_sessions (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid references public.committees (id) on delete set null,  -- null = everyone
  event_id      uuid,                                                        -- FK added in events migration
  type          text not null default 'meeting' check (type in ('meeting', 'workshop', 'training', 'event')),
  title         text not null,
  location      text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  check_in_open boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index attendance_sessions_season_start_idx on public.attendance_sessions (season_id, starts_at desc);
create index attendance_sessions_committee_idx on public.attendance_sessions (committee_id);
create trigger attendance_sessions_updated_at before update on public.attendance_sessions
  for each row execute function private.set_updated_at();

-- QR secrets are never readable by users: RLS enabled, no policies.
create table public.session_secrets (
  session_id  uuid primary key references public.attendance_sessions (id) on delete cascade,
  secret      text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);

create table public.attendance (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.attendance_sessions (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  status         text not null check (status in ('present', 'late', 'absent', 'excused')),
  method         text not null default 'manual' check (method in ('qr', 'manual', 'link')),
  checked_in_at  timestamptz,
  recorded_by    uuid references public.profiles (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (session_id, user_id)
);
create index attendance_user_idx on public.attendance (user_id);
create index attendance_recorder_idx on public.attendance (recorded_by);

create table public.excuse_requests (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.attendance_sessions (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  reason       text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (session_id, user_id)
);
create index excuse_requests_user_idx on public.excuse_requests (user_id);
create index excuse_requests_status_idx on public.excuse_requests (status) where status = 'pending';
create index excuse_requests_reviewer_idx on public.excuse_requests (reviewed_by);

-- ---------------------------------------------------------------------
-- Points: append-only ledger (bonus / penalty). No money involved.
-- ---------------------------------------------------------------------
create table public.point_rules (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name_ar      text not null,
  name_en      text not null,
  type         text not null check (type in ('bonus', 'penalty')),
  value        int not null check (value > 0),
  is_auto      boolean not null default false,
  active       boolean not null default true,
  description  text,
  created_at   timestamptz not null default now()
);

create table public.point_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  season_id    uuid not null references public.seasons (id) on delete cascade,
  committee_id uuid references public.committees (id) on delete set null,
  type         text not null check (type in ('bonus', 'penalty')),
  value        int not null check (value > 0),
  reason       text not null,
  source       text not null default 'manual' check (source in ('manual', 'task', 'attendance', 'rule', 'event')),
  source_id    uuid,
  rule_id      uuid references public.point_rules (id) on delete set null,
  given_by     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  voided_at    timestamptz,
  voided_by    uuid references public.profiles (id) on delete set null,
  void_reason  text
);
create index point_entries_user_season_idx on public.point_entries (user_id, season_id) where voided_at is null;
create index point_entries_season_idx on public.point_entries (season_id);
create index point_entries_committee_idx on public.point_entries (committee_id);
create index point_entries_given_by_idx on public.point_entries (given_by);
create index point_entries_rule_idx on public.point_entries (rule_id);

-- Ledger rules: never delete, only void.
create or replace function private.point_entries_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Point entries cannot be deleted; void them instead';
  end if;
  if (new.user_id, new.season_id, new.type, new.value, new.reason, new.source, new.source_id, new.given_by, new.created_at)
     is distinct from
     (old.user_id, old.season_id, old.type, old.value, old.reason, old.source, old.source_id, old.given_by, old.created_at) then
    raise exception 'Point entries are append-only; only voiding is allowed';
  end if;
  if old.voided_at is not null and new.voided_at is distinct from old.voided_at then
    raise exception 'Entry is already voided';
  end if;
  return new;
end;
$$;
create trigger point_entries_guard before update or delete on public.point_entries
  for each row execute function private.point_entries_immutable();

-- Denormalised totals for the leaderboard (rebuildable from the ledger).
create table public.member_scores (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  season_id      uuid not null references public.seasons (id) on delete cascade,
  bonus_total    int not null default 0,
  penalty_total  int not null default 0,
  total          int not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, season_id)
);
create index member_scores_season_total_idx on public.member_scores (season_id, total desc);

create or replace function private.refresh_member_score()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_scores (user_id, season_id, bonus_total, penalty_total, total, updated_at)
  select new.user_id, new.season_id,
         coalesce(sum(value) filter (where type = 'bonus'), 0),
         coalesce(sum(value) filter (where type = 'penalty'), 0),
         coalesce(sum(case when type = 'bonus' then value else -value end), 0),
         now()
  from public.point_entries
  where user_id = new.user_id and season_id = new.season_id and voided_at is null
  on conflict (user_id, season_id) do update
    set bonus_total = excluded.bonus_total,
        penalty_total = excluded.penalty_total,
        total = excluded.total,
        updated_at = now();
  return null;
end;
$$;
create trigger point_entries_score after insert or update on public.point_entries
  for each row execute function private.refresh_member_score();

create trigger audit_point_entries after insert or update or delete on public.point_entries
  for each row execute function private.audit_row();

create table public.point_disputes (
  id              uuid primary key default gen_random_uuid(),
  point_entry_id  uuid not null references public.point_entries (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  reason          text not null,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  response        text,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (point_entry_id, user_id)
);
create index point_disputes_user_idx on public.point_disputes (user_id);
create index point_disputes_status_idx on public.point_disputes (status) where status = 'pending';
create index point_disputes_reviewer_idx on public.point_disputes (reviewed_by);

-- ---------------------------------------------------------------------
-- Evaluations, announcements, notifications
-- ---------------------------------------------------------------------
create table public.evaluations (
  id                  uuid primary key default gen_random_uuid(),
  season_id           uuid not null references public.seasons (id) on delete cascade,
  member_id           uuid not null references public.profiles (id) on delete cascade,
  evaluator_id        uuid not null references public.profiles (id) on delete cascade,
  period              text not null,
  scores              jsonb not null default '{}'::jsonb,
  notes               text,
  visible_to_member   boolean not null default false,
  created_at          timestamptz not null default now()
);
create index evaluations_member_idx on public.evaluations (member_id, season_id);
create index evaluations_evaluator_idx on public.evaluations (evaluator_id);
create index evaluations_season_idx on public.evaluations (season_id);

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid references public.seasons (id) on delete cascade,
  committee_id  uuid references public.committees (id) on delete cascade,  -- null = everyone
  title         text not null,
  body          text not null,
  pinned        boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  published_at  timestamptz not null default now(),
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index announcements_committee_idx on public.announcements (committee_id, published_at desc);
create index announcements_season_idx on public.announcements (season_id);
create index announcements_creator_idx on public.announcements (created_by);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  data        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
