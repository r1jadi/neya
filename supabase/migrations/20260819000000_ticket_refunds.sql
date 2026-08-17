-- RaiAccept ticket refunds: verified refund history plus atomic refund-capacity
-- accounting on ticket_payment_attempts.
--
-- Concurrency rule: capacity is CLAIMED (refund_pending_cents) before any
-- provider refund request, so two concurrent admin refunds can never push
-- cumulative refunds past the original paid amount. Claims are moved to
-- refunded_amount_cents only after the provider refund transaction is verified
-- successful, or released on a definitive failure.

alter table public.ticket_payment_attempts
  add column if not exists refund_pending_cents integer not null default 0;

alter table public.ticket_payment_attempts drop constraint if exists ticket_payment_attempts_refund_pending_check;
alter table public.ticket_payment_attempts add constraint ticket_payment_attempts_refund_pending_check
  check (refund_pending_cents >= 0 and refunded_amount_cents + refund_pending_cents <= amount_cents);

create table if not exists public.ticket_refunds (
  id uuid primary key default gen_random_uuid(),
  ticket_order_id uuid not null references public.ticket_orders(id) on delete cascade,
  payment_attempt_id uuid not null references public.ticket_payment_attempts(id) on delete cascade,
  provider text not null check (provider = 'raiaccept'),
  provider_order_id text not null,
  provider_transaction_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'requested'
    check (status in ('requested', 'succeeded', 'failed', 'uncertain')),
  provider_status_code text,
  provider_status_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_refunds_attempt_idx on public.ticket_refunds(payment_attempt_id, created_at desc);
create index if not exists ticket_refunds_order_idx on public.ticket_refunds(ticket_order_id, created_at desc);
create index if not exists ticket_refunds_status_idx on public.ticket_refunds(status);

alter table public.ticket_refunds enable row level security;
-- No client policies: refund state is maintained only by server-side admin
-- actions through the service role.

-- Atomically claim refund capacity for an attempt. Returns false when the
-- request would exceed the remaining refundable amount (original minus
-- refunded minus already-pending). The row lock serializes concurrent claims.
create or replace function public.claim_refund_capacity(p_attempt_id uuid, p_amount_cents integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_attempt public.ticket_payment_attempts%rowtype;
begin
  if p_amount_cents is null or p_amount_cents < 1 then return false; end if;
  select * into v_attempt from public.ticket_payment_attempts where id = p_attempt_id for update;
  if not found then return false; end if;
  if v_attempt.refunded_amount_cents + v_attempt.refund_pending_cents + p_amount_cents > v_attempt.amount_cents then
    return false;
  end if;
  update public.ticket_payment_attempts
    set refund_pending_cents = v_attempt.refund_pending_cents + p_amount_cents,
        updated_at = now()
    where id = p_attempt_id;
  return true;
end $$;

-- Move a claimed refund from pending to refunded (p_succeeded = true) or
-- release the claim on a definitive failure (p_succeeded = false).
create or replace function public.settle_refund_capacity(p_attempt_id uuid, p_amount_cents integer, p_succeeded boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_attempt public.ticket_payment_attempts%rowtype;
begin
  if p_amount_cents is null or p_amount_cents < 1 then return; end if;
  select * into v_attempt from public.ticket_payment_attempts where id = p_attempt_id for update;
  if not found then return; end if;
  if p_succeeded then
    update public.ticket_payment_attempts
      set refunded_amount_cents = v_attempt.refunded_amount_cents + p_amount_cents,
          refund_pending_cents = greatest(0, v_attempt.refund_pending_cents - p_amount_cents),
          updated_at = now()
      where id = p_attempt_id;
  else
    update public.ticket_payment_attempts
      set refund_pending_cents = greatest(0, v_attempt.refund_pending_cents - p_amount_cents),
          updated_at = now()
      where id = p_attempt_id;
  end if;
end $$;

grant execute on function public.claim_refund_capacity(uuid, integer) to service_role;
grant execute on function public.settle_refund_capacity(uuid, integer, boolean) to service_role;
