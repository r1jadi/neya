-- Reservation integrity hardening.
--
-- Vulnerabilities closed by this migration:
--
-- A. reservation_payment_attempts and reservation_payment_webhook_events were
--    created WITHOUT row level security (20260826000000). Because Supabase
--    grants default privileges on new tables to anon/authenticated, ANY user
--    (including anonymous) could read and write every reservation payment
--    attempt (amounts, provider order/transaction ids) and read the full
--    webhook payloads (financial PII). RLS is now enabled with no client
--    policies: only the service role (server actions / webhooks) can access
--    these tables.
--
-- B. The "Reservations own insert" / "Reservations own update" RLS policies
--    allowed any authenticated user to create/update their own reservation rows
--    with ANY column values: status='confirmed', payment_status='paid',
--    arbitrary deposit_cents, booking_kind='vip', arbitrary party_size
--    (including negatives / 32767), arbitrary venue_id/event_id pairings,
--    and server-managed timestamps. Reservation creation is now done only
--    through the trusted create_reservation() function below, which derives
--    EVERY server-controlled field (user_id, status, payment_status,
--    payment_method, deposit, booking_kind) from the venue/event config and
--    the authenticated session.
--
-- C. An UPDATE integrity trigger prevents any non-privileged context from
--    mutating reservation rows (defense-in-depth: the dropped self-update
--    policy would already deny it). Service role, admins and venue staff
--    (owner_id or assigned venue account) can still manage reservations,
--    preserving the venue portal, the legacy /business reservations flow for
--    venue owners, and the admin dashboard.

-- 1. Payment-controlled tables belong to the backend only.
alter table public.reservation_payment_attempts enable row level security;
alter table public.reservation_payment_webhook_events enable row level security;
-- No client policies are created: service-role access only (admin client,
-- webhooks, reconciliation). Non-service insert/update/select are all denied.

-- 2. Trusted reservation creation. Mirrors lib/reservations/config.ts.
--    - user_id is ALWAYS auth.uid() — never caller-supplied.
--    - status / payment_status / payment_method / deposit_cents / booking_kind
--      are derived from the venue/event configuration and the chosen method.
--    - party_size is clamped 1..20, notes/phone are length-capped server-side.
--    - the event, when given, must belong to the venue (coherence check) and
--      reservations must be enabled.
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
    -- The event must belong to the same venue (venue-less events have none).
    if v_event.venue_id is not null
       and (p_venue_id is null or v_event.venue_id <> p_venue_id) then
      raise exception using message = 'missing-venue';
    end if;
  end if;

  -- Resolve config, mirroring lib/reservations/config.ts: the event's value
  -- wins, otherwise the venue's, otherwise the default (0 EUR / online-free /
  -- pay-at-venue allowed / reservations enabled).
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

  -- Available methods, mirroring resolveReservationConfig exactly.
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

  v_party := greatest(1, least(20, coalesce(p_party_size, 2)));

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

revoke all on function public.create_reservation(uuid, uuid, integer, text, text, text) from public;
grant execute on function public.create_reservation(uuid, uuid, integer, text, text, text) to authenticated;

-- 3. Remove the client's direct INSERT/UPDATE escape hatches on
--    reservations. Clients may only create through create_reservation();
--    venue staff and service role keep their own UPDATE policies.
drop policy if exists "Reservations own insert" on public.reservations;
drop policy if exists "Reservations own update" on public.reservations;

-- 4. Defense-in-depth: nobody outside service role, admins and venue staff
--    may update a reservation order, regardless of future policy drift.
create or replace function public.protect_reservations_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.auth_is_admin()
     or public.can_manage_venue(coalesce(new.venue_id, old.venue_id)) then
    return new;
  end if;
  raise exception 'Reservations can only be modified through the reservation system or by venue staff';
end;
$$;

drop trigger if exists trg_reservations_protect_integrity on public.reservations;
create trigger trg_reservations_protect_integrity
  before update on public.reservations
  for each row execute function public.protect_reservations_integrity();

-- ---------------------------------------------------------------------------
-- Verification (run in the Supabase SQL editor with the app's anon key + a
-- normal user JWT for the "authenticated user" steps):
--
-- 1. Direct mass-assignment INSERT must FAIL:
--      insert into public.reservations
--        (venue_id, user_id, status, payment_status, deposit_cents, booking_kind)
--      values ('<venue-uuid>', auth.uid(), 'confirmed', 'paid', 0, 'vip');
--    Expected: ERROR: new row violates row-level security policy
--
-- 2. Self UPDATE must FAIL:
--      update public.reservations set status='confirmed', payment_status='paid'
--      where user_id = auth.uid();
--    Expected: ERROR (policy violation) / trigger raises
--
-- 3. The trusted creation path works for a normal user:
--      select public.create_reservation(
--        '<venue-uuid>', null, 2, 'hello', '00383000000000', 'pay_at_venue');
--    Expected: returns a reservation id; row has user_id = auth.uid(),
--    status='pending_payment', payment_status='due_at_venue',
--    deposit_cents = venue's configured price in cents.
--
-- 4. Crafted inputs are normalized/derived, not stored:
--    - select public.create_reservation('<venue>', null, -50, repeat('x',600),
--        repeat('y',80), 'online');  -> party_size 1..20, notes/phone capped.
--    - passing a price-altering venue/event mismatch raises 'missing-venue'.
--
-- 5. Payment tables are now hidden from clients:
--    (anon key)  select * from public.reservation_payment_attempts;
--    Expected: empty result (permission denied on RLS, service role only).
-- ---------------------------------------------------------------------------