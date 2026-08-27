-- The previous event_capacity_state() declaration used output column names
-- "capacity" and "seats_taken" that collided with PL/pgSQL variables in the
-- final SELECT. PostgreSQL consequently raised 42702 (ambiguous column), and
-- the checkout action surfaced that failure as the generic sold-out/capacity
-- redirect. Qualify the return columns and keep the corrected reservation
-- filtering in the same deployed definition.

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
  select e.* into v_event
    from public.events as e
   where e.id = p_event_id;
  if not found then
    raise exception using message = 'reservation';
  end if;

  v_capacity := v_event.capacity;
  if v_capacity is null and v_event.venue_id is not null then
    select v.capacity into v_capacity
      from public.venues as v
     where v.id = v_event.venue_id;
  end if;

  select coalesce(sum(coalesce(t.quantity_sold, 0) + coalesce(t.quantity_reserved, 0)), 0)
    into v_taken
    from public.tickets as t
   where t.event_id = p_event_id;

  if v_event.venue_id is not null then
    select v_taken + coalesce(sum(coalesce(r.party_size, 0)), 0)
      into v_taken
      from public.reservations as r
     where (r.event_id = p_event_id
            or (r.event_id is null and r.venue_id = v_event.venue_id))
       and r.status in ('pending', 'pending_payment', 'confirmed')
       and coalesce(r.payment_status, 'pending') not in ('failed', 'refunded');
  else
    select v_taken + coalesce(sum(coalesce(r.party_size, 0)), 0)
      into v_taken
      from public.reservations as r
     where r.event_id = p_event_id
       and r.status in ('pending', 'pending_payment', 'confirmed')
       and coalesce(r.payment_status, 'pending') not in ('failed', 'refunded');
  end if;

  return query
    select v_capacity as capacity, v_taken as seats_taken;
end;
$$;

grant execute on function public.event_capacity_state(uuid) to authenticated;
grant execute on function public.event_capacity_state(uuid) to service_role;
