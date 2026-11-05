-- =====================================================================
-- Migration: 20261105085000_secure_event_registration_recovery.sql
-- Fix public event-registration flow so a caller cannot retrieve an existing
-- ticket_code merely by knowing the attendee's email address and event.
-- Requires p_verify_proof = true (proof of email ownership) before returning
-- an existing ticket_code.
-- =====================================================================

-- 1. Replace private.register_for_event with proof verification parameter
create or replace function private.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_verify_proof boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_reg record;
  v_count int;
  v_status text;
  v_code text;
  v_clean_email text;
begin
  v_clean_email := lower(trim(p_email));

  -- 1) Return existing registration details if already registered for this event.
  -- SECURITY: Only return ticket_code if p_verify_proof is TRUE.
  -- An unverified public caller knowing only email + event_id must NEVER receive the ticket code.
  select id, ticket_code, status, event_id into v_reg
  from public.event_registrations
  where event_id = p_event_id and lower(email) = v_clean_email;

  if found then
    return jsonb_build_object(
      'id', v_reg.id,
      'ticket_code', case when p_verify_proof then v_reg.ticket_code else null end,
      'status', v_reg.status,
      'is_existing', true
    );
  end if;

  -- 2) Lock the event row for atomic capacity check
  select id, capacity, status, registration_open, ends_at into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('error', 'EVENT_NOT_FOUND');
  end if;

  if v_event.status <> 'published' or not v_event.registration_open then
    return jsonb_build_object('error', 'REGISTRATION_CLOSED');
  end if;

  if v_event.ends_at is not null and v_event.ends_at < now() then
    return jsonb_build_object('error', 'EVENT_FINISHED');
  end if;

  -- 3) Count current active registrations
  select count(*) into v_count
  from public.event_registrations
  where event_id = p_event_id and status in ('registered', 'attended');

  if v_event.capacity is not null and v_count >= v_event.capacity then
    v_status := 'waitlist';
  else
    v_status := 'registered';
  end if;

  -- 4) Generate unique ticket code: ENQ-<6 hex>
  v_code := 'ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.event_registrations (
    event_id, full_name, email, phone, ticket_code, status
  ) values (
    p_event_id, trim(p_full_name), v_clean_email, nullif(trim(p_phone), ''), v_code, v_status
  )
  on conflict (event_id, email) do update
    set full_name = excluded.full_name
  returning id, ticket_code, status into v_reg;

  return jsonb_build_object(
    'id', v_reg.id,
    'ticket_code', v_reg.ticket_code,
    'status', v_reg.status,
    'is_existing', false
  );
end;
$$;

-- Backward-compatible 4-argument signature defaulting p_verify_proof to false
create or replace function private.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.register_for_event(p_event_id, p_full_name, p_email, p_phone, false);
$$;

-- 2. Public RPC wrappers callable strictly by service_role for the register-event Edge Function
create or replace function public.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_verify_proof boolean default false
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.register_for_event(p_event_id, p_full_name, p_email, p_phone, p_verify_proof);
$$;

create or replace function public.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.register_for_event(p_event_id, p_full_name, p_email, p_phone, false);
$$;

revoke all on function public.register_for_event(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text, text, boolean) to service_role;

revoke all on function public.register_for_event(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text, text) to service_role;

