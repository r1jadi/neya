-- Dynamic reservation pricing and payment methods (venue defaults, event overrides)

alter table public.venues
  add column if not exists reservation_price_eur numeric(10, 2) not null default 0,
  add column if not exists requires_online_payment boolean not null default false,
  add column if not exists allows_pay_at_venue boolean not null default true;

alter table public.events
  add column if not exists reservation_price_eur numeric(10, 2),
  add column if not exists requires_online_payment boolean,
  add column if not exists allows_pay_at_venue boolean;

alter table public.reservations
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists booking_kind text not null default 'table';

alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending', 'pending_payment', 'confirmed', 'rejected', 'cancelled'));

alter table public.reservations drop constraint if exists reservations_payment_method_check;
alter table public.reservations
  add constraint reservations_payment_method_check
  check (payment_method is null or payment_method in ('online', 'pay_at_venue', 'none'));

alter table public.reservations drop constraint if exists reservations_payment_status_check;
alter table public.reservations
  add constraint reservations_payment_status_check
  check (
    payment_status in ('pending', 'paid', 'waived', 'due_at_venue', 'failed', 'refunded')
  );

alter table public.reservations drop constraint if exists reservations_booking_kind_check;
alter table public.reservations
  add constraint reservations_booking_kind_check
  check (booking_kind in ('table', 'vip', 'bottle', 'guestlist'));

comment on column public.venues.reservation_price_eur is 'Default table reservation fee in EUR (0 = free)';
comment on column public.events.reservation_price_eur is 'Event override; null inherits venue';
comment on column public.reservations.payment_method is 'online | pay_at_venue | none';
comment on column public.reservations.payment_status is 'pending | paid | waived | due_at_venue | failed | refunded';
comment on column public.reservations.booking_kind is 'Scalable for VIP/table/bottle flows';
