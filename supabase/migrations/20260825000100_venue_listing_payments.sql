-- NEYA Places listing fee — simple monthly online payment.
-- One-time migration: adds the fee/paid-through columns to venues and a
-- payer-facing record table for RaiAccept listing payments.

alter table public.venues
  add column if not exists listing_fee_cents integer not null default 990,
  add column if not exists listing_paid_until timestamptz;

comment on column public.venues.listing_fee_cents is 'Monthly NEYA Places listing fee in integer cents (default 990 = 9.90 EUR).';
comment on column public.venues.listing_paid_until is 'When the current paid listing period ends (null = never paid / free listing allowed).';

create table if not exists public.venue_listing_payments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'EUR',
  merchant_order_reference text not null unique,
  provider_order_id text null,
  checkout_session_id text null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled','refunded')),
  provider_status_code text null,
  provider_status_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_listing_payments_venue_idx
  on public.venue_listing_payments (venue_id, created_at desc);

-- Webhook audit trail (pure server-side; no RLS needed beyond service role).
create table if not exists public.listing_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'raiaccept',
  provider_transaction_id text null,
  provider_order_id text null,
  merchant_order_reference text null,
  payload_hash text not null unique,
  payload jsonb not null,
  processed_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.listing_payment_webhook_events enable row level security;

-- No client access to webhook events.
drop policy if exists "Listing webhook events no client access" on public.listing_payment_webhook_events;
create policy "Listing webhook events no client access"
  on public.listing_payment_webhook_events for all
  to authenticated
  with check (false);

alter table public.venue_listing_payments enable row level security;

-- Venue owners can see their own listing payments.
drop policy if exists "Venue listing payments own select" on public.venue_listing_payments;
create policy "Venue listing payments own select"
  on public.venue_listing_payments for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates are done server-side with the service role (admin client);
-- authenticated users cannot write directly.
drop policy if exists "Venue listing payments no client write" on public.venue_listing_payments;
create policy "Venue listing payments no client write"
  on public.venue_listing_payments for all
  to authenticated
  with check (false);