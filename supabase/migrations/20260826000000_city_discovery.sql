-- A registry makes the discovery hierarchy explicit without changing the
-- existing event/venue foreign keys or any commerce-related relationships.
create table if not exists public.cities (
  slug text primary key,
  name text not null,
  country_slug text not null,
  country_name text not null,
  region_slug text not null,
  region_name text not null,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cities enable row level security;
drop policy if exists "Public active cities read" on public.cities;
create policy "Public active cities read" on public.cities for select using (is_active = true);

-- NEYA's established launch city. More cities are activated only when NEYA
-- has a verified programme and a record is deliberately added by operations.
insert into public.cities (slug, name, country_slug, country_name, region_slug, region_name, latitude, longitude, is_active)
values ('prishtina', 'Prishtina', 'kosovo', 'Kosovo', 'balkans', 'Balkans', 42.6629, 21.1655, true)
on conflict (slug) do update set
  name = excluded.name, country_slug = excluded.country_slug, country_name = excluded.country_name,
  region_slug = excluded.region_slug, region_name = excluded.region_name,
  latitude = excluded.latitude, longitude = excluded.longitude, is_active = excluded.is_active,
  updated_at = now();

create index if not exists cities_region_country_active_idx on public.cities (region_slug, country_slug) where is_active = true;
