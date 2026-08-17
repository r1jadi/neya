-- RaiAccept ticket checkout migration.
--
-- Two surgical changes to the reservation RPC:
--  1. New ticket orders are provider-neutral (payment_provider = NULL) at
--     reservation time. The service-role checkout flow labels the order with
--     the actual provider ('raiaccept' or 'stripe') once a payment attempt
--     starts. The foundation previously hardcoded 'stripe' for every new order,
--     which is no longer accurate now that new ticket checkouts use RaiAccept.
--  2. Duplicate in-flight purchases are rejected atomically: a user may hold
--     only one non-terminal order (pending/processing, not yet released) per
--     ticket. This blocks double-clicks / repeated submissions from creating
--     uncontrolled duplicate orders.

create or replace function public.reserve_ticket_order(p_ticket_id uuid, p_quantity integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.tickets%rowtype;
  v_order_id uuid := gen_random_uuid();
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
  -- One in-flight purchase per ticket per user (serialized by the ticket row lock above).
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
  -- payment_provider stays NULL: the service-role checkout flow sets it.
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

grant execute on function public.reserve_ticket_order(uuid, integer) to authenticated;
