-- RaiAccept reservation payments. Historical provider columns are retained untouched;
-- new checkout attempts use provider-neutral references and RaiAccept only.

alter table public.reservations
  add column if not exists payment_provider text,
  add column if not exists merchant_order_reference text;

create unique index if not exists reservations_merchant_order_reference_key
  on public.reservations(merchant_order_reference) where merchant_order_reference is not null;

create table if not exists public.reservation_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  provider text not null check (provider = 'raiaccept'),
  provider_order_id text,
  checkout_session_id text,
  provider_transaction_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  provider_status_code text,
  provider_status_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists reservation_payment_attempts_provider_order_key
  on public.reservation_payment_attempts(provider, provider_order_id) where provider_order_id is not null;

create table if not exists public.reservation_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'raiaccept'),
  provider_transaction_id text not null,
  provider_order_id text not null,
  payload_hash text not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_result text,
  created_at timestamptz not null default now(),
  unique (provider, payload_hash)
);
