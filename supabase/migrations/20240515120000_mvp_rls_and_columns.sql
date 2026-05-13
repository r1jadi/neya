-- MVP: booking RLS, admin flag, checkout columns, ticket_orders default

alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.reservations add column if not exists stripe_checkout_session text;

alter table public.guestlist_entries add column if not exists contact text;

alter table public.ticket_orders alter column status set default 'pending';

-- Authenticated users manage their own reservations
drop policy if exists "Reservations own select" on public.reservations;
create policy "Reservations own select" on public.reservations for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Reservations own insert" on public.reservations;
create policy "Reservations own insert" on public.reservations for insert to authenticated with check (auth.uid() = user_id);

-- Venue owners can see their venues even if not approved yet
drop policy if exists "Venues owner select" on public.venues;
create policy "Venues owner select" on public.venues for select to authenticated using (auth.uid() = owner_id);

-- Intentionally no owner UPDATE here (prevents self-approval). Venue edits / approval via admin tools.
drop policy if exists "Guestlists select" on public.guestlists;
create policy "Guestlists select" on public.guestlists for select using (true);

drop policy if exists "Guestlist entries own select" on public.guestlist_entries;
create policy "Guestlist entries own select" on public.guestlist_entries for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Guestlist entries own insert" on public.guestlist_entries;
create policy "Guestlist entries own insert" on public.guestlist_entries for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Tickets select" on public.tickets;
create policy "Tickets select" on public.tickets for select using (true);

drop policy if exists "Ticket orders own select" on public.ticket_orders;
create policy "Ticket orders own select" on public.ticket_orders for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Ticket orders own insert" on public.ticket_orders;
create policy "Ticket orders own insert" on public.ticket_orders for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Reservations own update" on public.reservations;
create policy "Reservations own update" on public.reservations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Ticket orders own update" on public.ticket_orders;
create policy "Ticket orders own update" on public.ticket_orders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
