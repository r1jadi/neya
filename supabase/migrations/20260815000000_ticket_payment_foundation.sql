-- Provider-neutral payment state for ticket orders. Existing Stripe ticket orders
-- remain readable while all new orders receive an immutable payment snapshot.

alter table public.ticket_orders
  add column if not exists amount_cents integer,
  add column if not exists currency text,
  add column if not exists merchant_order_reference text,
  add column if not exists payment_provider text,
  add column if not exists payment_status text;

alter table public.ticket_orders drop constraint if exists ticket_orders_amount_cents_check;
alter table public.ticket_orders add constraint ticket_orders_amount_cents_check
  check (amount_cents is null or amount_cents >= 0);
alter table public.ticket_orders drop constraint if exists ticket_orders_currency_check;
alter table public.ticket_orders add constraint ticket_orders_currency_check
  check (currency is null or currency ~ '^[A-Z]{3}$');
alter table public.ticket_orders drop constraint if exists ticket_orders_payment_provider_check;
alter table public.ticket_orders add constraint ticket_orders_payment_provider_check
  check (payment_provider is null or payment_provider in ('stripe', 'raiaccept'));
alter table public.ticket_orders drop constraint if exists ticket_orders_payment_status_check;
alter table public.ticket_orders add constraint ticket_orders_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'));
alter table public.ticket_orders drop constraint if exists ticket_orders_payment_snapshot_check;
alter table public.ticket_orders add constraint ticket_orders_payment_snapshot_check
  check ((amount_cents is null and currency is null) or (amount_cents is not null and currency is not null));

-- Keep historical amounts unset rather than copying a ticket tier's current price.
-- The reference is deterministic and does not claim that a provider order exists.
update public.ticket_orders
set merchant_order_reference = 'neya_ticket_' || id::text
where merchant_order_reference is null;

update public.ticket_orders
set payment_status = case status
  when 'paid' then 'paid'
  when 'refunded' then 'refunded'
  when 'cancelled' then 'cancelled'
  else 'pending'
end
where payment_status is null;

-- The prior ticket checkout implementation was Stripe-only. Do not manufacture
-- a provider for rows without a recorded Stripe session.
update public.ticket_orders
set payment_provider = 'stripe'
where payment_provider is null and stripe_checkout_session is not null;

alter table public.ticket_orders alter column merchant_order_reference set not null;
alter table public.ticket_orders alter column payment_status set not null;
alter table public.ticket_orders alter column payment_status set default 'pending';

create unique index if not exists ticket_orders_merchant_order_reference_key
  on public.ticket_orders(merchant_order_reference);
create index if not exists ticket_orders_payment_status_idx
  on public.ticket_orders(payment_status);
create index if not exists ticket_orders_payment_provider_status_idx
  on public.ticket_orders(payment_provider, payment_status);

create table if not exists public.ticket_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  ticket_order_id uuid not null references public.ticket_orders(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'raiaccept')),
  provider_order_id text,
  provider_transaction_id text,
  checkout_session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  provider_status_code text,
  provider_status_message text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  refunded_amount_cents integer not null default 0
    check (refunded_amount_cents >= 0 and refunded_amount_cents <= amount_cents),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ticket_payment_attempts_provider_order_id_key
  on public.ticket_payment_attempts(provider, provider_order_id)
  where provider_order_id is not null;
create unique index if not exists ticket_payment_attempts_provider_transaction_id_key
  on public.ticket_payment_attempts(provider, provider_transaction_id)
  where provider_transaction_id is not null;
create unique index if not exists ticket_payment_attempts_provider_checkout_session_id_key
  on public.ticket_payment_attempts(provider, checkout_session_id)
  where checkout_session_id is not null;
create index if not exists ticket_payment_attempts_ticket_order_created_idx
  on public.ticket_payment_attempts(ticket_order_id, created_at desc);
create index if not exists ticket_payment_attempts_reconciliation_idx
  on public.ticket_payment_attempts(provider, status, provider_order_id);

-- RaiAccept may retry notifications. Store the payload and deduplicate both an
-- exact payload and the same provider transaction state before applying effects.
create table if not exists public.ticket_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'raiaccept'),
  provider_transaction_id text,
  provider_order_id text,
  transaction_type text,
  status text,
  status_code text,
  payload_hash text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text,
  processing_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists ticket_payment_webhook_events_provider_payload_hash_key
  on public.ticket_payment_webhook_events(provider, payload_hash);
create unique index if not exists ticket_payment_webhook_events_transaction_state_key
  on public.ticket_payment_webhook_events(
    provider,
    provider_transaction_id,
    transaction_type,
    status,
    coalesce(status_code, '')
  )
  where provider_transaction_id is not null;
create index if not exists ticket_payment_webhook_events_order_received_idx
  on public.ticket_payment_webhook_events(provider, provider_order_id, received_at desc);
create index if not exists ticket_payment_webhook_events_unprocessed_idx
  on public.ticket_payment_webhook_events(received_at)
  where processed_at is null;

alter table public.ticket_payment_attempts enable row level security;
alter table public.ticket_payment_webhook_events enable row level security;

-- Ticket orders are created only through reserve_ticket_order. Payment and QR
-- fields are then maintained by service-role checkout/webhook code, never clients.
drop policy if exists "Ticket orders own insert" on public.ticket_orders;
drop policy if exists "Ticket orders own update" on public.ticket_orders;
drop policy if exists "Ticket orders venue staff update" on public.ticket_orders;

create or replace function public.protect_ticket_order_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.amount_cents is distinct from old.amount_cents
    or new.currency is distinct from old.currency
    or new.merchant_order_reference is distinct from old.merchant_order_reference then
    raise exception 'Ticket payment snapshot is immutable';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and (
      new.status is distinct from old.status
      or new.payment_status is distinct from old.payment_status
      or new.payment_provider is distinct from old.payment_provider
      or new.stripe_checkout_session is distinct from old.stripe_checkout_session
      or new.qr_payload is distinct from old.qr_payload
      or new.inventory_released is distinct from old.inventory_released
      or new.used_at is distinct from old.used_at
    ) then
    raise exception 'Ticket payment and fulfillment fields are server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ticket_orders_protect_payment_fields on public.ticket_orders;
create trigger trg_ticket_orders_protect_payment_fields
  before update on public.ticket_orders
  for each row execute function public.protect_ticket_order_payment_fields();

-- Snapshot the purchasable ticket under the same inventory lock used today.
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
  update public.tickets set quantity_reserved = quantity_reserved + p_quantity where id = p_ticket_id;
  insert into public.ticket_orders(
    id, ticket_id, user_id, quantity, status, payment_status, payment_provider,
    amount_cents, currency, merchant_order_reference
  ) values (
    v_order_id, p_ticket_id, auth.uid(), p_quantity, 'pending', 'pending', 'stripe',
    v_ticket.price_cents * p_quantity, upper(coalesce(v_ticket.currency, 'EUR')),
    'neya_ticket_' || v_order_id::text
  );
  return v_order_id;
end $$;

create or replace function public.release_ticket_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.ticket_orders%rowtype;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if found and v_order.status = 'pending' and v_order.payment_status in ('pending', 'processing') and not v_order.inventory_released then
    update public.tickets set quantity_reserved = greatest(0, quantity_reserved - v_order.quantity) where id = v_order.ticket_id;
    update public.ticket_orders
      set inventory_released = true, status = 'cancelled', payment_status = 'cancelled'
      where id = p_order_id;
  end if;
end $$;

create or replace function public.complete_ticket_order(p_order_id uuid, p_session_id text, p_qr_payload text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_order public.ticket_orders%rowtype;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.payment_status = 'paid' then return true; end if;
  if v_order.status <> 'pending' or v_order.payment_status not in ('pending', 'processing') or v_order.inventory_released then return false; end if;
  update public.tickets set quantity_reserved = greatest(0, quantity_reserved - v_order.quantity), quantity_sold = quantity_sold + v_order.quantity
    where id = v_order.ticket_id;
  update public.ticket_orders
    set status = 'paid', payment_status = 'paid', payment_provider = 'stripe',
        stripe_checkout_session = p_session_id, qr_payload = p_qr_payload
    where id = p_order_id;
  return true;
end $$;

grant execute on function public.reserve_ticket_order(uuid, integer) to authenticated;
grant execute on function public.release_ticket_order(uuid) to service_role;
grant execute on function public.complete_ticket_order(uuid, text, text) to service_role;
