-- =====================================================================
-- Phase 15: Notifications, Announcements Fan-out & Automated Routines
-- Migration: 20261104010000_phase15_notifications_automation.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Notifications Deduplication Key & Index
-- ---------------------------------------------------------------------
alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

-- ---------------------------------------------------------------------
-- 2. Add notifications to Realtime Publication (idempotent)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then
  raise notice 'Could not add notifications to supabase_realtime publication: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 3. Job Runs Table (Audit Log for Automated Routines)
-- ---------------------------------------------------------------------
create table if not exists public.job_runs (
  id          bigint generated always as identity primary key,
  job         text not null,
  ran_at      timestamptz not null default now(),
  ok          boolean not null default true,
  details     jsonb not null default '{}'::jsonb
);

create index if not exists job_runs_job_ran_at_idx on public.job_runs (job, ran_at desc);
create index if not exists job_runs_ran_at_idx on public.job_runs (ran_at desc);

alter table public.job_runs enable row level security;

-- Only president and super_admin can inspect automated job runs
drop policy if exists job_runs_select on public.job_runs;
create policy job_runs_select on public.job_runs for select to authenticated
  using ((select private.can(array['president', 'super_admin'])));

-- Revoke write permissions from public/anon/authenticated (jobs run via SECURITY DEFINER)
revoke all on public.job_runs from public, anon, authenticated;
grant select on public.job_runs to authenticated;
grant all on public.job_runs to service_role;

-- ---------------------------------------------------------------------
-- 4. Central Private Notification Creation Helper
-- ---------------------------------------------------------------------
create or replace function private.create_notification(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_body        text,
  p_link        text,
  p_data        jsonb,
  p_dedupe_key  text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link,
    data,
    dedupe_key,
    created_at
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_link,
    coalesce(p_data, '{}'::jsonb),
    p_dedupe_key,
    now()
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do nothing;
end;
$$;

revoke all on function private.create_notification(uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Trigger Functions for Core System Events
-- ---------------------------------------------------------------------

-- (a) Task Assigned / Reassigned
create or replace function private.trg_notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignee uuid := new.assignee_id;
begin
  if v_assignee is not null and (tg_op = 'INSERT' or (old.assignee_id is distinct from new.assignee_id)) then
    perform private.create_notification(
      v_assignee,
      'task_assigned',
      'تم تعيين مهمة جديدة لك',
      new.title,
      '/dashboard/tasks',
      jsonb_build_object('task_id', new.id, 'priority', new.priority, 'due_date', new.due_date),
      'task_assign:' || new.id || ':' || v_assignee
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_notify_assigned on public.tasks;
create trigger trg_tasks_notify_assigned
  after insert or update of assignee_id on public.tasks
  for each row execute function private.trg_notify_task_assigned();

-- (b) Task Status Changed
create or replace function private.trg_notify_task_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_head_id uuid;
  v_status_ar text;
begin
  if old.status is distinct from new.status then
    v_status_ar := case new.status
      when 'todo' then 'قيد الانتظار'
      when 'in_progress' then 'قيد التنفيذ'
      when 'review' then 'قيد المراجعة'
      when 'done' then 'تم الإنجاز'
      when 'cancelled' then 'ملغاة'
      else new.status
    end;

    -- 1. Notify creator if distinct from assignee / actor
    if new.created_by is not null and new.created_by is distinct from new.assignee_id then
      perform private.create_notification(
        new.created_by,
        'task_status',
        'تحديث حالة المهمة',
        new.title || ' أصبح بحالة: ' || v_status_ar,
        '/dashboard/tasks',
        jsonb_build_object('task_id', new.id, 'status', new.status),
        'task_status:' || new.id || ':' || new.status || ':' || new.created_by
      );
    end if;

    -- 2. Notify committee head
    if new.committee_id is not null then
      for v_head_id in (
        select user_id from public.user_roles
        where role = 'committee_head'
          and committee_id = new.committee_id
          and user_id is distinct from new.assignee_id
          and user_id is distinct from new.created_by
      ) loop
        perform private.create_notification(
          v_head_id,
          'task_status',
          'تحديث حالة مهمة باللجنة',
          new.title || ' أصبح بحالة: ' || v_status_ar,
          '/dashboard/tasks',
          jsonb_build_object('task_id', new.id, 'status', new.status, 'assignee_id', new.assignee_id),
          'task_status:' || new.id || ':' || new.status || ':' || v_head_id
        );
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_notify_status on public.tasks;
create trigger trg_tasks_notify_status
  after update of status on public.tasks
  for each row execute function private.trg_notify_task_status();

-- (c) Points Added / Voided
create or replace function private.trg_notify_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_ar text;
begin
  if tg_op = 'INSERT' then
    v_type_ar := case when new.type = 'bonus' then 'مكافأة' else 'خصم' end;
    perform private.create_notification(
      new.user_id,
      'point_added',
      'إشعار نقاط: ' || v_type_ar || ' (' || case when new.type = 'bonus' then '+' else '-' end || new.value || ')',
      new.reason,
      '/dashboard/points',
      jsonb_build_object('entry_id', new.id, 'type', new.type, 'value', new.value),
      'point_entry:' || new.id
    );
  elsif tg_op = 'UPDATE' and old.voided_at is null and new.voided_at is not null then
    perform private.create_notification(
      new.user_id,
      'point_voided',
      'تم إلغاء عملية نقاط سابقة',
      coalesce(new.void_reason, new.reason),
      '/dashboard/points',
      jsonb_build_object('entry_id', new.id, 'voided_at', new.voided_at),
      'point_void:' || new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_point_entries_notify on public.point_entries;
create trigger trg_point_entries_notify
  after insert or update of voided_at on public.point_entries
  for each row execute function private.trg_notify_points();

-- (d) Announcement Published (Fan-out to Active Members or Committee Members)
create or replace function private.trg_notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_user uuid;
  v_short_body text;
begin
  -- Only fan out if published_at is reached
  if new.published_at <= now() then
    v_short_body := substring(new.body from 1 for 150);

    if new.committee_id is null then
      -- General announcement: all active members of the active season + leadership
      for v_target_user in (
        select distinct m.user_id
        from public.memberships m
        join public.seasons s on s.id = m.season_id and s.is_active = true
        where m.status = 'active'
          and (new.created_by is null or m.user_id is distinct from new.created_by)
        union
        select distinct ur.user_id
        from public.user_roles ur
        where ur.role in ('president', 'vice_president', 'hr_admin', 'super_admin')
          and (new.created_by is null or ur.user_id is distinct from new.created_by)
      ) loop
        perform private.create_notification(
          v_target_user,
          'announcement',
          'إعلان عام: ' || new.title,
          v_short_body,
          '/dashboard/announcements',
          jsonb_build_object('announcement_id', new.id, 'pinned', new.pinned),
          'announcement:' || new.id || ':' || v_target_user
        );
      end loop;
    else
      -- Committee-specific announcement
      for v_target_user in (
        select distinct m.user_id
        from public.memberships m
        join public.seasons s on s.id = m.season_id and s.is_active = true
        where m.committee_id = new.committee_id
          and m.status = 'active'
          and (new.created_by is null or m.user_id is distinct from new.created_by)
        union
        select distinct ur.user_id
        from public.user_roles ur
        where ur.committee_id = new.committee_id
          and ur.role = 'committee_head'
          and (new.created_by is null or ur.user_id is distinct from new.created_by)
      ) loop
        perform private.create_notification(
          v_target_user,
          'announcement',
          'إعلان لجنتك: ' || new.title,
          v_short_body,
          '/dashboard/announcements',
          jsonb_build_object('announcement_id', new.id, 'committee_id', new.committee_id),
          'announcement:' || new.id || ':' || v_target_user
        );
      end loop;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_announcements_notify on public.announcements;
create trigger trg_announcements_notify
  after insert on public.announcements
  for each row execute function private.trg_notify_announcement_published();

-- (e) Excuse Decided
create or replace function private.trg_notify_excuse_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_title text;
  v_title text;
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    select title into v_session_title
    from public.attendance_sessions
    where id = new.session_id;

    v_title := case new.status
      when 'approved' then 'تم قبول عذر الغياب'
      else 'تم رفض عذر الغياب'
    end;

    perform private.create_notification(
      new.user_id,
      'excuse_decision',
      v_title,
      coalesce(v_session_title, 'جلسة الحضور') || ' - تم مراجعة الطلب والبت فيه.',
      '/dashboard/attendance',
      jsonb_build_object('session_id', new.session_id, 'status', new.status),
      'excuse:' || new.id || ':' || new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_excuse_notify on public.excuse_requests;
create trigger trg_excuse_notify
  after update of status on public.excuse_requests
  for each row execute function private.trg_notify_excuse_decided();

-- (f) Dispute Decided
create or replace function private.trg_notify_dispute_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'rejected') then
    v_title := case new.status
      when 'accepted' then 'تم قبول اعتراض النقاط'
      else 'تم رفض اعتراض النقاط'
    end;

    perform private.create_notification(
      new.user_id,
      'dispute_decision',
      v_title,
      coalesce(new.response, 'راجع صفحة النقاط للاطلاع على التفاصيل.'),
      '/dashboard/points',
      jsonb_build_object('dispute_id', new.id, 'status', new.status),
      'dispute:' || new.id || ':' || new.status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dispute_notify on public.point_disputes;
create trigger trg_dispute_notify
  after update of status on public.point_disputes
  for each row execute function private.trg_notify_dispute_decided();

-- (g) New Application Received -> HR & President
create or replace function private.trg_notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid;
begin
  for v_admin in (
    select distinct user_id
    from public.user_roles
    where role in ('hr_admin', 'president', 'super_admin')
  ) loop
    perform private.create_notification(
      v_admin,
      'new_application',
      'طلب انضمام جديد',
      'قدم ' || new.full_name || ' طلباً للانضمام إلى الفريق.',
      '/dashboard/applications',
      jsonb_build_object('application_id', new.id, 'applicant', new.full_name),
      'app_received:' || new.id || ':' || v_admin
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_applications_notify on public.applications;
create trigger trg_applications_notify
  after insert on public.applications
  for each row execute function private.trg_notify_new_application();

-- (h) New Contact Message Received -> PR & President
create or replace function private.trg_notify_new_contact_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid;
begin
  for v_admin in (
    select distinct user_id
    from public.user_roles
    where role in ('pr_admin', 'president', 'super_admin')
  ) loop
    perform private.create_notification(
      v_admin,
      'new_contact_message',
      'رسالة تواصل جديدة',
      new.full_name || ' (' || coalesce(new.subject, new.kind) || ')',
      '/dashboard/site',
      jsonb_build_object('message_id', new.id, 'kind', new.kind, 'email', new.email),
      'contact_msg:' || new.id || ':' || v_admin
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_contact_notify on public.contact_messages;
create trigger trg_contact_notify
  after insert on public.contact_messages
  for each row execute function private.trg_notify_new_contact_message();

-- (i) Payment Confirmed -> Recorded PR Officer & PR Team
create or replace function private.trg_notify_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    -- Notify the PR person who recorded the payment + PR leadership
    for v_recipient in (
      select distinct new.recorded_by as uid where new.recorded_by is not null
      union
      select distinct user_id as uid from public.user_roles where role in ('pr_admin', 'super_admin')
    ) loop
      perform private.create_notification(
        v_recipient,
        'payment_confirmed',
        'تم اعتماد الدفعة المالية بنجاح',
        'تم اعتماد دفعة بقيمة ' || new.amount || ' ج.م للمؤسسة.',
        '/dashboard/finance',
        jsonb_build_object('payment_id', new.id, 'agreement_id', new.agreement_id, 'amount', new.amount),
        'payment_confirmed:' || new.id || ':' || v_recipient
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_notify_confirmed on public.payments;
create trigger trg_payments_notify_confirmed
  after update of status on public.payments
  for each row execute function private.trg_notify_payment_confirmed();

-- ---------------------------------------------------------------------
-- 6. Automated Routine Functions (Idempotent, Log to public.job_runs)
-- ---------------------------------------------------------------------

-- (a) Mark Overdue Payments
create or replace function private.mark_overdue_payments()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  with updated as (
    update public.payments
    set status = 'overdue',
        updated_at = now()
    where status = 'pending'
      and due_date < current_date
    returning 1
  )
  select count(*) into v_count from updated;

  insert into public.job_runs (job, ok, details)
  values (
    'mark_overdue_payments',
    true,
    jsonb_build_object('overdue_count', v_count, 'executed_at', now())
  );

  return json_build_object('ok', true, 'updated_count', v_count);
exception when others then
  insert into public.job_runs (job, ok, details)
  values ('mark_overdue_payments', false, jsonb_build_object('error', sqlerrm));
  raise;
end;
$$;

revoke all on function private.mark_overdue_payments() from public, anon, authenticated;

-- (b) Notify Due and Overdue Payments
create or replace function private.notify_due_payments()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment record;
  v_recipient uuid;
  v_notified_count int := 0;
begin
  -- 1. Pending payments due within 3 days or today -> finance_admin, pr_admin, president
  for v_payment in (
    select p.id, p.amount, p.due_date, a.title as agreement_title, c.name as company_name
    from public.payments p
    join public.agreements a on a.id = p.agreement_id
    join public.companies c on c.id = a.company_id
    where p.status = 'pending'
      and p.due_date between current_date and (current_date + interval '3 days')
  ) loop
    for v_recipient in (
      select distinct user_id
      from public.user_roles
      where role in ('finance_admin', 'pr_admin', 'president', 'super_admin')
    ) loop
      perform private.create_notification(
        v_recipient,
        'payment_due',
        'تذكير: دفعة مالية مستحقة قريباً',
        'دفعة بقيمة ' || v_payment.amount || ' ج.م مستحقة في ' || v_payment.due_date || ' (' || v_payment.company_name || ')',
        '/dashboard/finance',
        jsonb_build_object('payment_id', v_payment.id, 'due_date', v_payment.due_date, 'amount', v_payment.amount),
        'payment_due:' || v_payment.id || ':' || current_date::text || ':' || v_recipient
      );
      v_notified_count := v_notified_count + 1;
    end loop;
  end loop;

  -- 2. Overdue payments -> Leadership
  for v_payment in (
    select p.id, p.amount, p.due_date, a.title as agreement_title, c.name as company_name
    from public.payments p
    join public.agreements a on a.id = p.agreement_id
    join public.companies c on c.id = a.company_id
    where p.status = 'overdue'
       or (p.status = 'pending' and p.due_date < current_date)
  ) loop
    for v_recipient in (
      select distinct user_id
      from public.user_roles
      where role in ('president', 'vice_president', 'finance_admin', 'super_admin')
    ) loop
      perform private.create_notification(
        v_recipient,
        'payment_overdue',
        'تنبيه عاجل: دفعة مالية متأخرة',
        'دفعة متأخرة بقيمة ' || v_payment.amount || ' ج.م لشركة ' || v_payment.company_name,
        '/dashboard/finance',
        jsonb_build_object('payment_id', v_payment.id, 'due_date', v_payment.due_date, 'amount', v_payment.amount),
        'payment_overdue:' || v_payment.id || ':' || current_date::text || ':' || v_recipient
      );
      v_notified_count := v_notified_count + 1;
    end loop;
  end loop;

  insert into public.job_runs (job, ok, details)
  values (
    'notify_due_payments',
    true,
    jsonb_build_object('notifications_sent', v_notified_count, 'executed_at', now())
  );

  return json_build_object('ok', true, 'notifications_sent', v_notified_count);
exception when others then
  insert into public.job_runs (job, ok, details)
  values ('notify_due_payments', false, jsonb_build_object('error', sqlerrm));
  raise;
end;
$$;

revoke all on function private.notify_due_payments() from public, anon, authenticated;

-- (c) Notify Task Deadlines (Due within 24h to Assignee)
create or replace function private.notify_task_deadlines()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task record;
  v_count int := 0;
begin
  for v_task in (
    select t.id, t.title, t.due_date, t.assignee_id
    from public.tasks t
    where t.status not in ('done', 'cancelled')
      and t.assignee_id is not null
      and t.due_date is not null
      and t.due_date between now() and (now() + interval '24 hours')
  ) loop
    perform private.create_notification(
      v_task.assignee_id,
      'task_deadline',
      'تذكير: اقتراب موعد تسليم المهمة',
      'المهمة "' || v_task.title || '" مستحقة خلال 24 ساعة.',
      '/dashboard/tasks',
      jsonb_build_object('task_id', v_task.id, 'due_date', v_task.due_date),
      'task_deadline:' || v_task.id || ':' || current_date::text || ':' || v_task.assignee_id
    );
    v_count := v_count + 1;
  end loop;

  insert into public.job_runs (job, ok, details)
  values (
    'notify_task_deadlines',
    true,
    jsonb_build_object('reminders_sent', v_count, 'executed_at', now())
  );

  return json_build_object('ok', true, 'reminders_sent', v_count);
exception when others then
  insert into public.job_runs (job, ok, details)
  values ('notify_task_deadlines', false, jsonb_build_object('error', sqlerrm));
  raise;
end;
$$;

revoke all on function private.notify_task_deadlines() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Scheduling with pg_cron (Safe Conditional Extension Setup)
-- ---------------------------------------------------------------------
do $$
begin
  -- Try to create extension if pg_cron is available
  create extension if not exists pg_cron with schema extensions;

  -- 1. Unschedule any existing jobs with identical names for clean idempotency
  begin
    perform cron.unschedule('mark-overdue-payments');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('notify-due-payments');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('notify-task-deadlines');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('apply-overdue-task-penalties');
  exception when others then null;
  end;
  begin
    perform cron.unschedule('keep-alive-ping');
  exception when others then null;
  end;

  -- 2. Schedule routines
  -- Daily at 04:00 UTC: Mark overdue payments
  perform cron.schedule('mark-overdue-payments', '0 4 * * *', 'select private.mark_overdue_payments();');

  -- Daily at 05:00 UTC: Payment reminders
  perform cron.schedule('notify-due-payments', '0 5 * * *', 'select private.notify_due_payments();');

  -- Daily at 05:30 UTC: Task deadlines reminder
  perform cron.schedule('notify-task-deadlines', '30 5 * * *', 'select private.notify_task_deadlines();');

  -- Daily at 06:00 UTC: Automatic overdue task penalties (Phase 9)
  perform cron.schedule('apply-overdue-task-penalties', '0 6 * * *', 'select private.apply_overdue_task_penalties();');

  -- Keep-alive ping every 12 h
  perform cron.schedule('keep-alive-ping', '0 */12 * * *', 'select 1;');

exception when others then
  raise notice 'pg_cron setup deferred (extension may require Supabase dashboard toggle): %', sqlerrm;
end $$;
