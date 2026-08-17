-- RaiAccept webhook support: make ticket order completion provider-aware.
--
-- The foundation's complete_ticket_order hardcoded payment_provider = 'stripe'
-- and wrote the provider reference into stripe_checkout_session. New ticket
-- checkouts use RaiAccept, so the same atomic, idempotent fulfillment path now
-- accepts the provider explicitly. The Stripe webhook keeps identical behavior
-- by passing provider = 'stripe'; RaiAccept orders keep the Stripe session
-- column untouched and carry their provider order id on ticket_payment_attempts.

drop function if exists public.complete_ticket_order(uuid, text, text);

create or replace function public.complete_ticket_order(
  p_order_id uuid,
  p_provider text,
  p_provider_reference text,
  p_qr_payload text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_order public.ticket_orders%rowtype;
begin
  if p_provider not in ('stripe', 'raiaccept') then
    raise exception 'Invalid payment provider';
  end if;
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.payment_status = 'paid' then return true; end if;
  if v_order.status <> 'pending' or v_order.payment_status not in ('pending', 'processing') or v_order.inventory_released then return false; end if;
  update public.tickets set quantity_reserved = greatest(0, quantity_reserved - v_order.quantity), quantity_sold = quantity_sold + v_order.quantity
    where id = v_order.ticket_id;
  update public.ticket_orders
    set status = 'paid', payment_status = 'paid', payment_provider = p_provider,
        stripe_checkout_session = case when p_provider = 'stripe' then p_provider_reference else stripe_checkout_session end,
        qr_payload = p_qr_payload
    where id = p_order_id;
  return true;
end $$;

grant execute on function public.complete_ticket_order(uuid, text, text, text) to service_role;
