-- =====================================================================
-- 20261102155231 CONTACT MESSAGES
-- Inbox for the public Contact form and the Become-a-Sponsor form.
-- Rows are inserted ONLY by an Edge Function (CAPTCHA + rate limit) using the
-- service role; nobody can insert from the browser.
-- =====================================================================

create table public.contact_messages (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'contact'
                    check (kind in ('contact', 'sponsor', 'partnership', 'feedback', 'other')),
  full_name         text not null,
  email             text not null,
  phone             text,
  organization      text,
  subject           text,
  message           text not null,
  package_interest  text,
  status            text not null default 'new'
                    check (status in ('new', 'read', 'replied', 'archived', 'spam')),
  handled_by        uuid references public.profiles (id) on delete set null,
  handled_at        timestamptz,
  internal_notes    text,
  ip_hash           text,
  created_at        timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index contact_messages_kind_idx on public.contact_messages (kind, created_at desc);
create index contact_messages_handled_by_idx on public.contact_messages (handled_by);

alter table public.contact_messages enable row level security;

create policy contact_messages_select on public.contact_messages for select to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy contact_messages_update on public.contact_messages for update to authenticated
  using ((select private.can(array['pr_admin', 'president', 'vice_president'])))
  with check ((select private.can(array['pr_admin', 'president', 'vice_president'])));
create policy contact_messages_delete on public.contact_messages for delete to authenticated
  using ((select private.can(array[]::text[])));

-- Grants: no insert from the browser; staff may only touch the workflow columns.
revoke all on public.contact_messages from anon, authenticated;
grant select, delete on public.contact_messages to authenticated;
grant update (status, handled_by, handled_at, internal_notes) on public.contact_messages to authenticated;
