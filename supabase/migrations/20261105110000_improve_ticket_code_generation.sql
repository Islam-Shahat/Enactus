-- =====================================================================
-- Migration: 20261105110000_improve_ticket_code_generation.sql
-- Improve ticket-code generation in event registration:
-- 1. Longer, unpredictable code: 'ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
--    providing 40 bits of CSPRNG entropy (> 1 trillion unique codes).
-- 2. Safe collision detection & retry loop (up to 10 attempts) handling both
--    proactive checks and reactive concurrent unique_violation exceptions.
-- 3. Update table column default to match canonical format.
-- =====================================================================

-- 1. Update event_registrations table default
alter table public.event_registrations
  alter column ticket_code set default ('ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

-- 2. Update private.register_for_event with collision retry loop
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
  v_attempts int := 0;
  v_max_attempts constant int := 10;
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

  -- 4) Generate unique ticket code with collision retry loop: ENQ-<10 hex>
  -- CSPRNG gen_random_uuid() provides 40 bits of entropy (> 1 trillion possibilities)
  loop
    v_attempts := v_attempts + 1;
    v_code := 'ENQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    -- Proactive collision check: ensure code does not already exist
    if not exists (
      select 1 from public.event_registrations where ticket_code = v_code
    ) then
      begin
        insert into public.event_registrations (
          event_id, full_name, email, phone, ticket_code, status
        ) values (
          p_event_id, trim(p_full_name), v_clean_email, nullif(trim(p_phone), ''), v_code, v_status
        )
        on conflict (event_id, email) do update
          set full_name = excluded.full_name
        returning id, ticket_code, status into v_reg;

        -- Success: exit collision loop
        exit;
      exception
        when unique_violation then
          -- In case of a race condition on ticket_code uniqueness, retry if attempts remain
          if v_attempts >= v_max_attempts then
            raise exception 'TICKET_CODE_GENERATION_FAILED'
              using message = 'Failed to generate unique ticket code after maximum attempts';
          end if;
      end;
    end if;

    if v_attempts >= v_max_attempts then
      raise exception 'TICKET_CODE_GENERATION_FAILED'
        using message = 'Failed to generate unique ticket code after maximum attempts';
    end if;
  end loop;

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

-- 3. Public RPC wrappers callable strictly by service_role for register-event Edge Function
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

