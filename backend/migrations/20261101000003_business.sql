-- =====================================================================
-- 0003 BUSINESS
-- Companies CRM, sponsorship packages, agreements, manual payments,
-- deliverables, posts, expenses, budgets. No payment gateway: payments
-- are recorded by hand with a receipt.
-- =====================================================================

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name_ar     text not null,
  name_en     text,
  industry    text,
  logo_url    text,
  website     text,
  address     text,
  stage       text not null default 'lead'
              check (stage in ('lead', 'contacted', 'negotiation', 'signed', 'delivered', 'renewal', 'lost')),
  owner_id    uuid references public.profiles (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index companies_stage_idx on public.companies (stage);
create index companies_owner_idx on public.companies (owner_id);
create trigger companies_updated_at before update on public.companies
  for each row execute function private.set_updated_at();

create table public.company_contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  job_title   text,
  phone       text,
  email       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index company_contacts_company_idx on public.company_contacts (company_id);

create table public.company_notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index company_notes_company_idx on public.company_notes (company_id, created_at desc);
create index company_notes_author_idx on public.company_notes (author_id);

create table public.sponsorship_packages (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid references public.seasons (id) on delete cascade,
  name_ar     text not null,
  name_en     text not null,
  tier        text not null default 'silver' check (tier in ('platinum', 'gold', 'silver', 'bronze', 'custom')),
  price       numeric(12, 2) not null check (price >= 0),
  benefits_ar jsonb not null default '[]'::jsonb,
  benefits_en jsonb not null default '[]'::jsonb,
  is_public   boolean not null default true,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index sponsorship_packages_season_idx on public.sponsorship_packages (season_id);

create table public.agreements (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  company_id    uuid not null references public.companies (id) on delete restrict,
  package_id    uuid references public.sponsorship_packages (id) on delete set null,
  title         text not null,
  total_value   numeric(12, 2) not null check (total_value >= 0),
  start_date    date,
  end_date      date,
  contract_path text,
  status        text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  owner_id      uuid references public.profiles (id) on delete set null,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index agreements_company_idx on public.agreements (company_id);
create index agreements_season_status_idx on public.agreements (season_id, status);
create index agreements_package_idx on public.agreements (package_id);
create index agreements_owner_idx on public.agreements (owner_id);
create trigger agreements_updated_at before update on public.agreements
  for each row execute function private.set_updated_at();
create trigger audit_agreements after insert or update or delete on public.agreements
  for each row execute function private.audit_row();

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  agreement_id  uuid not null references public.agreements (id) on delete cascade,
  kind          text not null default 'installment' check (kind in ('deposit', 'installment', 'final')),
  amount        numeric(12, 2) not null check (amount > 0),
  due_date      date,
  paid_at       timestamptz,
  method        text check (method in ('cash', 'bank_transfer', 'wallet', 'cheque')),
  receipt_path  text,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  recorded_by   uuid references public.profiles (id) on delete set null,
  confirmed_by  uuid references public.profiles (id) on delete set null,
  confirmed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'paid' or paid_at is not null)
);
create index payments_agreement_idx on public.payments (agreement_id);
create index payments_due_status_idx on public.payments (due_date, status) where status in ('pending', 'overdue');
create index payments_recorded_by_idx on public.payments (recorded_by);
create index payments_confirmed_by_idx on public.payments (confirmed_by);
create trigger payments_updated_at before update on public.payments
  for each row execute function private.set_updated_at();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function private.audit_row();

-- Remaining balance per agreement (RLS of the caller applies)
create view public.agreement_balances with (security_invoker = true) as
select a.id as agreement_id,
       a.company_id,
       a.total_value,
       coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)                      as paid_total,
       a.total_value - coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)      as remaining,
       coalesce(sum(p.amount) filter (where p.status = 'overdue'), 0)                   as overdue_total
from public.agreements a
left join public.payments p on p.agreement_id = a.id
group by a.id;

-- Deliverables: what was promised (company_id is denormalised so the media
-- team can see deliverables without ever seeing agreement values).
create table public.deliverables (
  id             uuid primary key default gen_random_uuid(),
  agreement_id   uuid not null references public.agreements (id) on delete cascade,
  company_id     uuid not null references public.companies (id) on delete cascade,
  kind           text not null check (kind in ('post', 'story', 'reel', 'banner', 'mention', 'booth', 'other')),
  title          text,
  required_count int not null default 1 check (required_count > 0),
  due_date       date,
  created_at     timestamptz not null default now()
);
create index deliverables_agreement_idx on public.deliverables (agreement_id);
create index deliverables_company_idx on public.deliverables (company_id);

create or replace function private.fill_deliverable_company()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.company_id is null then
    select company_id into new.company_id from public.agreements where id = new.agreement_id;
  end if;
  return new;
end;
$$;
-- company_id may be omitted on insert: it is copied from the agreement before the NOT NULL check runs.
create trigger deliverables_fill_company before insert on public.deliverables
  for each row execute function private.fill_deliverable_company();

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid references public.committees (id) on delete set null,
  platform      text not null check (platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube', 'other')),
  title         text not null,
  caption       text,
  media_paths   jsonb not null default '[]'::jsonb,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  post_url      text,
  status        text not null default 'draft'
                check (status in ('draft', 'review', 'approved', 'scheduled', 'published', 'cancelled')),
  created_by    uuid references public.profiles (id) on delete set null,
  approved_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_season_status_idx on public.posts (season_id, status);
create index posts_scheduled_idx on public.posts (scheduled_at) where status in ('approved', 'scheduled');
create index posts_committee_idx on public.posts (committee_id);
create index posts_creator_idx on public.posts (created_by);
create index posts_approver_idx on public.posts (approved_by);
create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();

create table public.post_deliverables (
  post_id         uuid not null references public.posts (id) on delete cascade,
  deliverable_id  uuid not null references public.deliverables (id) on delete cascade,
  primary key (post_id, deliverable_id)
);
create index post_deliverables_deliverable_idx on public.post_deliverables (deliverable_id);

-- Progress is always computed (never stored), so it cannot drift.
create view public.deliverable_progress with (security_invoker = true) as
select d.id as deliverable_id,
       d.agreement_id,
       d.company_id,
       d.kind,
       d.required_count,
       count(p.id) filter (where p.status = 'published') as done_count
from public.deliverables d
left join public.post_deliverables pd on pd.deliverable_id = d.id
left join public.posts p on p.id = pd.post_id
group by d.id;

-- ---------------------------------------------------------------------
-- Expenses & budgets (event_id FK added in the events migration)
-- ---------------------------------------------------------------------
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid references public.committees (id) on delete set null,
  event_id      uuid,
  title         text not null,
  amount        numeric(12, 2) not null check (amount > 0),
  category      text,
  receipt_path  text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  requested_by  uuid not null references public.profiles (id) on delete cascade,
  approved_by   uuid references public.profiles (id) on delete set null,
  approved_at   timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index expenses_season_status_idx on public.expenses (season_id, status);
create index expenses_committee_idx on public.expenses (committee_id);
create index expenses_requested_by_idx on public.expenses (requested_by);
create index expenses_approved_by_idx on public.expenses (approved_by);
create trigger expenses_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();
create trigger audit_expenses after insert or update or delete on public.expenses
  for each row execute function private.audit_row();

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  committee_id  uuid references public.committees (id) on delete cascade,
  event_id      uuid,
  amount        numeric(12, 2) not null check (amount >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);
create index budgets_season_idx on public.budgets (season_id);
create index budgets_committee_idx on public.budgets (committee_id);

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
