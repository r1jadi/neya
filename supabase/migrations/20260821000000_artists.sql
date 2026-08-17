-- DJ & Artist directory.
--
-- artists        — public profiles (read for active, write for admins only)
-- event_artists  — many-to-many: an event can have several artists, an artist
--                  can play several events. The legacy events.performers
--                  JSONB stays for manual/legacy lineups.
-- artist_follows — users follow artists (own rows only, PK prevents dupes).

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  bio text,
  short_bio text,
  profile_image text,
  cover_image text,
  genres text[] not null default '{}',
  instagram_url text,
  spotify_url text,
  soundcloud_url text,
  website_url text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artists_active_idx on public.artists (is_active);
create index if not exists artists_featured_idx on public.artists (is_featured) where is_featured = true;

create table if not exists public.event_artists (
  event_id uuid not null references public.events (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, artist_id)
);

create index if not exists event_artists_artist_idx on public.event_artists (artist_id);

create table if not exists public.artist_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create index if not exists artist_follows_artist_idx on public.artist_follows (artist_id);

-- RLS
alter table public.artists enable row level security;
alter table public.event_artists enable row level security;
alter table public.artist_follows enable row level security;

-- Public can browse active artists; only admins write.
drop policy if exists "artists public read" on public.artists;
create policy "artists public read" on public.artists for select using (is_active = true);

drop policy if exists "artists admin insert" on public.artists;
create policy "artists admin insert" on public.artists for insert to authenticated with check (public.auth_is_admin());

drop policy if exists "artists admin update" on public.artists;
create policy "artists admin update" on public.artists for update to authenticated using (public.auth_is_admin());

drop policy if exists "artists admin delete" on public.artists;
create policy "artists admin delete" on public.artists for delete to authenticated using (public.auth_is_admin());

-- Event ↔ artist assignments are public knowledge; admin-managed.
drop policy if exists "event_artists public read" on public.event_artists;
create policy "event_artists public read" on public.event_artists for select using (true);

drop policy if exists "event_artists admin insert" on public.event_artists;
create policy "event_artists admin insert" on public.event_artists for insert to authenticated with check (public.auth_is_admin());

drop policy if exists "event_artists admin delete" on public.event_artists;
create policy "event_artists admin delete" on public.event_artists for delete to authenticated using (public.auth_is_admin());

-- Follows: each user manages only their own rows (PK also blocks duplicates).
drop policy if exists "artist_follows own select" on public.artist_follows;
create policy "artist_follows own select" on public.artist_follows for select to authenticated using (auth.uid() = user_id);

drop policy if exists "artist_follows own insert" on public.artist_follows;
create policy "artist_follows own insert" on public.artist_follows for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "artist_follows own delete" on public.artist_follows;
create policy "artist_follows own delete" on public.artist_follows for delete to authenticated using (auth.uid() = user_id);
