-- Nightlife guestlist: anonymous requests + admin/venue management

alter table public.guestlists
  add column if not exists is_open boolean not null default true,
  add column if not exists requires_manual_approval boolean not null default true;

create table if not exists public.guestlist_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guestlist_id uuid references public.guestlists (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  phone text not null,
  email text,
  group_size smallint not null default 1 check (group_size >= 1 and group_size <= 20),
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'checked_in')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_in_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null
);

create index if not exists guestlist_requests_event_id_idx on public.guestlist_requests (event_id);
create index if not exists guestlist_requests_status_idx on public.guestlist_requests (status);
create index if not exists guestlist_requests_created_at_idx on public.guestlist_requests (created_at desc);
create index if not exists guestlist_requests_phone_idx on public.guestlist_requests (phone);

-- One active request per phone per event (pending or approved)
create unique index if not exists guestlist_requests_event_phone_active_idx
  on public.guestlist_requests (event_id, phone)
  where status in ('pending', 'approved');

alter table public.guestlist_requests enable row level security;

-- Public cannot read requests (privacy); inserts via server actions (service role)

drop policy if exists "Guestlist requests admin all" on public.guestlist_requests;
create policy "Guestlist requests admin all" on public.guestlist_requests for all to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

drop policy if exists "Guestlist requests venue owner select" on public.guestlist_requests;
create policy "Guestlist requests venue owner select" on public.guestlist_requests for select to authenticated using (
  exists (
    select 1
    from public.events e
    join public.venues v on v.id = e.venue_id
    where e.id = event_id and v.owner_id = auth.uid()
  )
);

drop policy if exists "Guestlist requests venue owner update" on public.guestlist_requests;
create policy "Guestlist requests venue owner update" on public.guestlist_requests for update to authenticated using (
  exists (
    select 1
    from public.events e
    join public.venues v on v.id = e.venue_id
    where e.id = event_id and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.events e
    join public.venues v on v.id = e.venue_id
    where e.id = event_id and v.owner_id = auth.uid()
  )
);

drop policy if exists "Guestlist requests venue owner delete" on public.guestlist_requests;
create policy "Guestlist requests venue owner delete" on public.guestlist_requests for delete to authenticated using (
  exists (
    select 1
    from public.events e
    join public.venues v on v.id = e.venue_id
    where e.id = event_id and v.owner_id = auth.uid()
  )
);

-- Public aggregate for capacity UI (no PII)
create or replace function public.guestlist_spots_used(p_event_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(group_size), 0)::integer
  from public.guestlist_requests
  where event_id = p_event_id
    and status in ('pending', 'approved', 'checked_in');
$$;

grant execute on function public.guestlist_spots_used(uuid) to anon, authenticated;
