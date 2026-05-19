-- Venue partner accounts: admin-provisioned role with scoped venue access

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'venue', 'admin')),
  add column if not exists venue_id uuid references public.venues (id) on delete set null,
  add column if not exists account_active boolean not null default true;

-- Backfill admin role from legacy flag
update public.profiles
set role = 'admin'
where is_admin = true and role = 'user';

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_venue_id_idx on public.profiles (venue_id) where venue_id is not null;

-- One active venue account per venue (optional business rule)
create unique index if not exists profiles_one_active_venue_account_idx
  on public.profiles (venue_id)
  where role = 'venue' and account_active = true and venue_id is not null;

-- Auth helpers (security definer — used by RLS)
create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.account_active = true
      and (p.role = 'admin' or p.is_admin = true)
  );
$$;

create or replace function public.auth_venue_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.venue_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'venue'
    and p.account_active = true
  limit 1;
$$;

create or replace function public.can_manage_venue(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_is_admin()
    or exists (
      select 1
      from public.venues v
      where v.id = p_venue_id
        and v.owner_id = auth.uid()
    )
    or public.auth_venue_id() = p_venue_id;
$$;

-- Prevent privilege escalation via profile self-update
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.venue_id is distinct from old.venue_id
    or new.is_admin is distinct from old.is_admin
    or new.account_active is distinct from old.account_active then
    raise exception 'Cannot modify privileged profile fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileged on public.profiles;
create trigger trg_profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- Venue staff read assigned venue (approved or not)
drop policy if exists "Venues venue staff select" on public.venues;
create policy "Venues venue staff select" on public.venues for select to authenticated using (
  public.auth_venue_id() = id
);

-- Block venue-role accounts from self-service venue/event creation
drop policy if exists "venues owner insert" on public.venues;
create policy "venues owner insert" on public.venues for insert to authenticated with check (
  auth.uid() = owner_id
  and coalesce(approved, false) = false
  and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'venue'
  )
);

drop policy if exists "events owner insert" on public.events;
create policy "events owner insert" on public.events for insert to authenticated with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
  and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'venue'
  )
);

-- Guestlist requests: admin + venue staff (owner or assigned venue account)
drop policy if exists "Guestlist requests admin all" on public.guestlist_requests;
create policy "Guestlist requests admin all" on public.guestlist_requests for all to authenticated using (
  public.auth_is_admin()
) with check (
  public.auth_is_admin()
);

drop policy if exists "Guestlist requests venue owner select" on public.guestlist_requests;
create policy "Guestlist requests venue staff select" on public.guestlist_requests for select to authenticated using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.can_manage_venue(e.venue_id)
  )
);

drop policy if exists "Guestlist requests venue owner update" on public.guestlist_requests;
create policy "Guestlist requests venue staff update" on public.guestlist_requests for update to authenticated using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.can_manage_venue(e.venue_id)
  )
) with check (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.can_manage_venue(e.venue_id)
  )
);

drop policy if exists "Guestlist requests venue owner delete" on public.guestlist_requests;
create policy "Guestlist requests venue staff delete" on public.guestlist_requests for delete to authenticated using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and public.can_manage_venue(e.venue_id)
  )
);

-- Reservations: venue staff
drop policy if exists "Reservations venue owner select" on public.reservations;
create policy "Reservations venue staff select" on public.reservations for select to authenticated using (
  public.can_manage_venue(venue_id)
);

drop policy if exists "Reservations venue owner update" on public.reservations;
create policy "Reservations venue staff update" on public.reservations for update to authenticated using (
  public.can_manage_venue(venue_id)
) with check (
  public.can_manage_venue(venue_id)
);

-- Events: venue staff read their venue's events
drop policy if exists "Events venue staff select" on public.events;
create policy "Events venue staff select" on public.events for select to authenticated using (
  public.can_manage_venue(venue_id)
);

-- Guestlist entries / ticket orders (legacy door lists)
drop policy if exists "Guestlist entries venue owner select" on public.guestlist_entries;
create policy "Guestlist entries venue staff select" on public.guestlist_entries for select to authenticated using (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    where g.id = guestlist_id
      and public.can_manage_venue(e.venue_id)
  )
);

drop policy if exists "Guestlist entries venue owner update" on public.guestlist_entries;
create policy "Guestlist entries venue staff update" on public.guestlist_entries for update to authenticated using (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    where g.id = guestlist_id
      and public.can_manage_venue(e.venue_id)
  )
) with check (
  exists (
    select 1
    from public.guestlists g
    join public.events e on e.id = g.event_id
    where g.id = guestlist_id
      and public.can_manage_venue(e.venue_id)
  )
);

drop policy if exists "Ticket orders venue owner select" on public.ticket_orders;
create policy "Ticket orders venue staff select" on public.ticket_orders for select to authenticated using (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    where t.id = ticket_id
      and public.can_manage_venue(e.venue_id)
  )
);

drop policy if exists "Ticket orders venue owner update" on public.ticket_orders;
create policy "Ticket orders venue staff update" on public.ticket_orders for update to authenticated using (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    where t.id = ticket_id
      and public.can_manage_venue(e.venue_id)
  )
) with check (
  exists (
    select 1
    from public.tickets t
    join public.events e on e.id = t.event_id
    where t.id = ticket_id
      and public.can_manage_venue(e.venue_id)
  )
);

-- Stories / event owner updates: exclude venue-role self-service
drop policy if exists "Events owner update" on public.events;
create policy "Events owner update" on public.events for update to authenticated using (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
  and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'venue'
  )
) with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
  and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'venue'
  )
);

grant execute on function public.auth_is_admin() to authenticated;
grant execute on function public.auth_venue_id() to authenticated;
grant execute on function public.can_manage_venue(uuid) to authenticated;
