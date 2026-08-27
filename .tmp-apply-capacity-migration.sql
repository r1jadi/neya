-- ============================================================================
-- NEYA capacity-enforcement migration (20260827000000)
-- Run this in the Supabase Dashboard SQL editor (Project: phiffyihjnpqhahfxrsz).
-- It is idempotent (CREATE OR REPLACE FUNCTION + GRANT). Safe to re-run.
-- Fixes S12: reservations/tickets can currently EXCEED event/venue capacity.
-- ============================================================================

-- Effective capacity + committed seats for an event.
create or replace function public.event_capacity_state(p_event_id uuid)
returns table(capacity integer, seats_taken integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_capacity integer;
  v_taken integer := 0;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception using message = 'reservation';
  end if;

  v_capacity := v_event.capacity;
  if v_capacity is null and v_event.venue_id is not null then
    select capacity into v_capacity from public.venues where id = v_event.venue_id;
  end if;

  select coalesce(sum(coalesce(quantity_sold, 0) + coalesce(quantity_reserved, 0)), 0)
    into v_taken
    from public.tickets
   where event_id = p_event_id;

  if v_event.venue_id is not null then
    select v_taken + coalesce(sum(coalesce(party_size, 0)), 0)
      into v_taken
      from public.reservations
     where (event_id = p_event_id
            or (event_id is null and venue_id = v_event.venue_id))
       and status in ('pending', 'pending_payment', 'confirmed');
  else
    select v_taken + coalesce(sum(coalesce(party_size, 0)), 0)
      into v_taken
      from public.reservations
     where event_id = p_event_id
       and status in ('pending', 'pending_payment', 'confirmed');
  end if;

  return query select v_capacity, v_taken;
end;
$$;

-- Reserve capacity before creating a reservation.
create or replace function public.create_reservation(
  p_venue_id uuid,
  p_event_id uuid,
  p_party_size integer,
  p_notes text,
  p_phone text,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue public.venues%rowtype;
  v_event public.events%rowtype;
  v_has_venue boolean := false;
  v_has_event boolean := false;
  v_price_euro numeric;
  v_requires_online boolean;
  v_allows_pay_at_venue boolean;
  v_enabled boolean;
  v_methods text[] := array[]::text[];
  v_method text;
  v_status text;
  v_payment_status text;
  v_deposit_cents integer;
  v_party integer;
  v_notes text;
  v_id uuid;
  v_capacity integer;
  v_taken integer;
begin
  if auth.uid() is null then
    raise exception 'must be signed in' using message = 'login';
  end if;

  if p_venue_id is null and p_event_id is null then
    raise exception using message = 'missing-venue';
  end if;

  if p_venue_id is not null then
    select * into v_venue from public.venues where id = p_venue_id;
    if not found then
      raise exception using message = 'reservation';
    end if;
    v_has_venue := true;
  end if;

  if p_event_id is not null then
    select * into v_event from public.events where id = p_event_id;
    if not found then
      raise exception using message = 'reservation';
    end if;
    v_has_event := true;
    if v_event.venue_id is not null
       and (p_venue_id is null or v_event.venue_id <> p_venue_id) then
      raise exception using message = 'missing-venue';
    end if;
  end if;

  v_party := greatest(1, least(20, coalesce(p_party_size, 2)));

  -- Capacity gate: effective event/venue capacity vs committed seats + this party.
  if v_has_event then
    perform pg_advisory_xact_lock(hashtext('neya_capacity:' || p_event_id::text));
    select capacity, seats_taken into v_capacity, v_taken
      from public.event_capacity_state(p_event_id);
    if v_capacity is not null and v_taken + v_party > v_capacity then
      raise exception using message = 'capacity';
    end if;
  end if;

  -- Resolve config, mirroring lib/reservations/config.ts.
  if v_has_event and v_event.reservation_price_eur is not null then
    v_price_euro := v_event.reservation_price_eur;
  elsif v_has_venue and v_venue.reservation_price_eur is not null then
    v_price_euro := v_venue.reservation_price_eur;
  else
    v_price_euro := 0;
  end if;
  if v_price_euro < 0 then v_price_euro := 0; end if;
  v_price_euro := round(v_price_euro, 2);

  if v_has_event and v_event.requires_online_payment is not null then
    v_requires_online := v_event.requires_online_payment;
  elsif v_has_venue and v_venue.requires_online_payment is not null then
    v_requires_online := v_venue.requires_online_payment;
  else
    v_requires_online := false;
  end if;

  if v_has_event and v_event.allows_pay_at_venue is not null then
    v_allows_pay_at_venue := v_event.allows_pay_at_venue;
  elsif v_has_venue and v_venue.allows_pay_at_venue is not null then
    v_allows_pay_at_venue := v_venue.allows_pay_at_venue;
  else
    v_allows_pay_at_venue := true;
  end if;

  if v_has_event and v_event.reservations_enabled is not null then
    v_enabled := v_event.reservations_enabled;
  elsif v_has_venue then
    v_enabled := coalesce(v_venue.reservations_enabled, true);
  else
    v_enabled := true;
  end if;
  if not v_enabled then
    raise exception using message = 'reservations-closed';
  end if;

  if (v_price_euro * 100)::integer <> 0 then
    if v_requires_online and not v_allows_pay_at_venue then
      v_methods := array['online'];
    elsif v_requires_online and v_allows_pay_at_venue then
      v_methods := array['online', 'pay_at_venue'];
    elsif not v_requires_online and v_allows_pay_at_venue then
      v_methods := array['pay_at_venue', 'online'];
    else
      v_methods := array['online'];
    end if;
  end if;

  if (v_price_euro * 100)::integer = 0 then
    v_method := 'none';
  elsif cardinality(v_methods) = 1 then
    v_method := v_methods[1];
  elsif p_payment_method in ('online', 'pay_at_venue')
        and p_payment_method = any(v_methods) then
    v_method := p_payment_method;
  else
    raise exception using message = 'payment-method';
  end if;

  v_notes := trim(left(coalesce(p_notes, ''), 500));
  if left(coalesce(p_phone, ''), 40) <> '' then
    v_notes := case when v_notes = '' then '' else v_notes || E'\n' end
               || 'Phone: ' || left(coalesce(p_phone, ''), 40);
  end if;

  if v_method = 'none' then
    v_status := 'confirmed';
    v_payment_status := 'waived';
    v_deposit_cents := 0;
  elsif v_method = 'pay_at_venue' then
    v_status := 'pending_payment';
    v_payment_status := 'due_at_venue';
    v_deposit_cents := (v_price_euro * 100)::integer;
  else
    v_status := 'pending';
    v_payment_status := 'pending';
    v_deposit_cents := (v_price_euro * 100)::integer;
  end if;

  insert into public.reservations (
    venue_id, event_id, user_id, status, party_size, deposit_cents,
    notes, payment_method, payment_status, booking_kind
  ) values (
    p_venue_id, p_event_id, auth.uid(), v_status, v_party, v_deposit_cents,
    nullif(v_notes, ''), v_method, v_payment_status, 'table'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Enforce the same cap on ticket orders.
create or replace function public.reserve_ticket_order(p_ticket_id uuid, p_quantity integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.tickets%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_capacity integer;
  v_taken integer;
begin
  if auth.uid() is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'Invalid ticket request';
  end if;
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or v_ticket.status <> 'available'
     or (v_ticket.sales_start is not null and v_ticket.sales_start > now())
     or (v_ticket.sales_end is not null and v_ticket.sales_end <= now())
     or (v_ticket.quantity_total is not null and v_ticket.quantity_sold + v_ticket.quantity_reserved + p_quantity > v_ticket.quantity_total) then
    raise exception 'Ticket type is unavailable';
  end if;

  -- Event capacity gate (effective = event value ?? venue value).
  perform pg_advisory_xact_lock(hashtext('neya_capacity:' || v_ticket.event_id::text));
  select capacity, seats_taken into v_capacity, v_taken
    from public.event_capacity_state(v_ticket.event_id);
  if v_capacity is not null and v_taken + p_quantity > v_capacity then
    raise exception using message = 'capacity';
  end if;
  if exists (
    select 1 from public.ticket_orders o
    where o.ticket_id = p_ticket_id
      and o.user_id = auth.uid()
      and o.payment_status in ('pending', 'processing')
      and not o.inventory_released
  ) then
    raise exception 'Ticket order already in progress';
  end if;
  update public.tickets set quantity_reserved = quantity_reserved + p_quantity where id = p_ticket_id;
  insert into public.ticket_orders(
    id, ticket_id, user_id, quantity, status, payment_status, payment_provider,
    amount_cents, currency, merchant_order_reference
  ) values (
    v_order_id, p_ticket_id, auth.uid(), p_quantity, 'pending', 'pending', null,
    v_ticket.price_cents * p_quantity, upper(coalesce(v_ticket.currency, 'EUR')),
    'neya_ticket_' || v_order_id::text
  );
  return v_order_id;
end $$;

grant execute on function public.event_capacity_state(uuid) to authenticated;
grant execute on function public.event_capacity_state(uuid) to service_role;
