-- Saved events, premium-only listings, public listing flag, ticket scan timestamp,
-- venue-owner access to reservations / guestlist entries / ticket validation,
-- activity feed reads for the FOMO strip

alter table public.events add column if not exists is_hidden_premium boolean not null default false;
alter table public.events add column if not exists is_listed_public boolean not null default true;

alter table public.ticket_orders add column if not exists used_at timestamptz;

-- Saved events (user bookmarks)
create table if not exists public.saved_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.saved_events enable row level security;

drop policy if exists "saved_events own select" on public.saved_events;
create policy "saved_events own select" on public.saved_events for select to authenticated using (auth.uid() = user_id);

drop policy if exists "saved_events own insert" on public.saved_events;
create policy "saved_events own insert" on public.saved_events for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "saved_events own delete" on public.saved_events;
create policy "saved_events own delete" on public.saved_events for delete to authenticated using (auth.uid() = user_id);

-- Replace wide-open events read: owners, public non-premium, or premium members for VIP listings
drop policy if exists "Public events read" on public.events;
create policy "Public events read" on public.events for select using (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
  or (
    coalesce(is_listed_public, true) = true
    and coalesce(is_hidden_premium, false) = false
  )
  or (
    coalesce(is_listed_public, true) = true
    and coalesce(is_hidden_premium, false) = true
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_premium, false) = true
    )
  )
);

-- Venue owners may update their events (pulse copy, live flag, premium flag only via admin in UI)
drop policy if exists "events owner update" on public.events;
create policy "events owner update" on public.events for update to authenticated using (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
);

-- Reservations: venue owners see rows for their venue
drop policy if exists "Reservations venue owner select" on public.reservations;
create policy "Reservations venue owner select" on public.reservations for select to authenticated using (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "Reservations venue owner update" on public.reservations;
create policy "Reservations venue owner update" on public.reservations for update to authenticated using (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
);

-- Guestlist entries: venue owners manage their door list
drop policy if exists "Guestlist entries venue owner select" on public.guestlist_entries;
create policy "Guestlist entries venue owner select" on public.guestlist_entries for select to authenticated using (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    join public.venues v on v.id = e.venue_id
    where g.id = guestlist_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "Guestlist entries venue owner update" on public.guestlist_entries;
create policy "Guestlist entries venue owner update" on public.guestlist_entries for update to authenticated using (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    join public.venues v on v.id = e.venue_id
    where g.id = guestlist_id
      and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    join public.venues v on v.id = e.venue_id
    where g.id = guestlist_id
      and v.owner_id = auth.uid()
  )
);

-- Ticket orders: venue owners read & mark used at door
drop policy if exists "Ticket orders venue owner select" on public.ticket_orders;
create policy "Ticket orders venue owner select" on public.ticket_orders for select to authenticated using (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    join public.venues v on v.id = e.venue_id
    where t.id = ticket_id
      and v.owner_id = auth.uid()
  )
);

drop policy if exists "Ticket orders venue owner update" on public.ticket_orders;
create policy "Ticket orders venue owner update" on public.ticket_orders for update to authenticated using (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    join public.venues v on v.id = e.venue_id
    where t.id = ticket_id
      and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    join public.venues v on v.id = e.venue_id
    where t.id = ticket_id
      and v.owner_id = auth.uid()
  )
);

-- Activity feed (public read recent; users insert own actor rows)
drop policy if exists "activity_feed public read" on public.activity_feed;
create policy "activity_feed public read" on public.activity_feed for select using (created_at > now() - interval '14 days');

drop policy if exists "activity_feed insert own" on public.activity_feed;
create policy "activity_feed insert own" on public.activity_feed for insert to authenticated with check (actor_id = auth.uid());
