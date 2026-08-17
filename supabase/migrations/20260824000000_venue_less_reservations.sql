-- Venue-less event reservations.
--
-- Events may exist without a venue, but admins still want the full booking
-- toolkit (reservations, tickets, guestlists) on those events. Reservations
-- previously hard-required a venue; venue_id is now optional (the existing
-- FK already permits nulls and keeps its cascade for real venue rows) and
-- the event carries its own reservations_enabled override (null = follow the
-- venue default when a venue exists, enabled when the event is venue-less).

alter table public.reservations
  alter column venue_id drop not null;

alter table public.events
  add column if not exists reservations_enabled boolean;

-- Venue-owner reservation policies match via venue_id, so venue-less
-- reservations are managed by the user themselves and the admin dashboard
-- (service role) — no RLS changes needed.
