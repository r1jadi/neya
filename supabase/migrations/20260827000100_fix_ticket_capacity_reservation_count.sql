-- Fix false ticket capacity failures caused by counting reservations that are
-- no longer financially active. A reservation is committed only while it is
-- pending/pending_payment/confirmed AND its payment state is still active.
-- This preserves confirmed free/pay-at-venue reservations and online payments
-- that are still pending, while excluding failed/refunded reservations.

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
       and status in ('pending', 'pending_payment', 'confirmed')
       and coalesce(payment_status, 'pending') not in ('failed', 'refunded');
  else
    select v_taken + coalesce(sum(coalesce(party_size, 0)), 0)
      into v_taken
      from public.reservations
     where event_id = p_event_id
       and status in ('pending', 'pending_payment', 'confirmed')
       and coalesce(payment_status, 'pending') not in ('failed', 'refunded');
  end if;

  return query select v_capacity, v_taken;
end;
$$;

grant execute on function public.event_capacity_state(uuid) to authenticated;
grant execute on function public.event_capacity_state(uuid) to service_role;
