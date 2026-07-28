-- Ticket types extend the existing tickets table. Existing ticket rows remain valid
-- and are treated as available ticket types named by tier_name.
alter table public.tickets
  add column if not exists description text,
  add column if not exists status text not null default 'available',
  add column if not exists quantity_reserved integer not null default 0;

alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('available', 'sold_out', 'closed'));
alter table public.tickets drop constraint if exists tickets_quantity_total_check;
alter table public.tickets add constraint tickets_quantity_total_check
  check (quantity_total is null or quantity_total >= 0);
alter table public.tickets drop constraint if exists tickets_quantity_sold_check;
alter table public.tickets add constraint tickets_quantity_sold_check
  check (quantity_sold >= 0 and quantity_reserved >= 0);

alter table public.ticket_orders
  add column if not exists quantity integer not null default 1,
  add column if not exists inventory_released boolean not null default false;
alter table public.ticket_orders drop constraint if exists ticket_orders_quantity_check;
alter table public.ticket_orders add constraint ticket_orders_quantity_check check (quantity > 0 and quantity <= 20);

create index if not exists tickets_event_status_idx on public.tickets(event_id, status);
create index if not exists ticket_orders_ticket_status_idx on public.ticket_orders(ticket_id, status);

-- Atomically reserve inventory before opening Stripe Checkout. Reservations are
-- released by cancelled/expired Checkout sessions and converted to sold units on payment.
create or replace function public.reserve_ticket_order(p_ticket_id uuid, p_quantity integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.tickets%rowtype;
  v_order_id uuid;
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
  update public.tickets set quantity_reserved = quantity_reserved + p_quantity where id = p_ticket_id;
  insert into public.ticket_orders(ticket_id, user_id, quantity, status)
    values (p_ticket_id, auth.uid(), p_quantity, 'pending') returning id into v_order_id;
  return v_order_id;
end $$;

create or replace function public.release_ticket_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.ticket_orders%rowtype;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if found and v_order.status = 'pending' and not v_order.inventory_released then
    update public.tickets set quantity_reserved = greatest(0, quantity_reserved - v_order.quantity) where id = v_order.ticket_id;
    update public.ticket_orders set inventory_released = true, status = 'cancelled' where id = p_order_id;
  end if;
end $$;

create or replace function public.complete_ticket_order(p_order_id uuid, p_session_id text, p_qr_payload text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_order public.ticket_orders%rowtype;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.status = 'paid' then return true; end if;
  if v_order.status <> 'pending' or v_order.inventory_released then return false; end if;
  update public.tickets set quantity_reserved = greatest(0, quantity_reserved - v_order.quantity), quantity_sold = quantity_sold + v_order.quantity
    where id = v_order.ticket_id;
  update public.ticket_orders set status = 'paid', stripe_checkout_session = p_session_id, qr_payload = p_qr_payload
    where id = p_order_id;
  return true;
end $$;

grant execute on function public.reserve_ticket_order(uuid, integer) to authenticated;
grant execute on function public.release_ticket_order(uuid) to service_role;
grant execute on function public.complete_ticket_order(uuid, text, text) to service_role;
