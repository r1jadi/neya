-- NEYA Guides: travel guides for tourists

-- Intercity bus routes (admin-configurable Kosovo transport)
create table if not exists public.intercity_bus_routes (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  destination text not null,
  route_name text not null,
  station_name text,
  station_latitude double precision,
  station_longitude double precision,
  departure_frequency text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  cover_image text,
  duration_days integer,
  duration_label text,
  location_type text not null default 'prishtina',
  location_name text,
  price numeric(10, 2) not null default 0,
  currency text not null default 'EUR',
  difficulty text not null default 'easy',
  featured boolean not null default false,
  published boolean not null default false,
  categories text[] not null default '{}',
  best_season text,
  daily_budget_eur numeric(10, 2),
  total_budget_eur numeric(10, 2),
  avg_visit_duration_minutes integer,
  family_friendly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_days (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  day_number integer not null,
  title text not null default '',
  description text,
  created_at timestamptz not null default now(),
  unique (guide_id, day_number)
);

create table if not exists public.guide_stops (
  id uuid primary key default gen_random_uuid(),
  guide_day_id uuid not null references public.guide_days(id) on delete cascade,
  name text not null,
  description text,
  latitude double precision,
  longitude double precision,
  category text not null default 'landmarks',
  image text,
  estimated_visit_time integer,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guide_transports (
  id uuid primary key default gen_random_uuid(),
  guide_stop_id uuid not null references public.guide_stops(id) on delete cascade,
  transport_type text not null,
  station_name text,
  station_latitude double precision,
  station_longitude double precision,
  departure_frequency text,
  notes text,
  route_name text,
  route_origin text,
  route_destination text,
  intercity_route_id uuid references public.intercity_bus_routes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.guide_purchases (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  purchase_date timestamptz not null default now(),
  access_until timestamptz,
  status text not null default 'pending',
  stripe_checkout_session text,
  created_at timestamptz not null default now(),
  unique (guide_id, user_id)
);

create table if not exists public.guide_itinerary_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  preferences jsonb not null default '{}',
  result jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists guides_published_idx on public.guides (published, featured desc);
create index if not exists guides_slug_idx on public.guides (slug);
create index if not exists guide_days_guide_id_idx on public.guide_days (guide_id);
create index if not exists guide_stops_day_id_idx on public.guide_stops (guide_day_id, order_index);
create index if not exists guide_purchases_user_idx on public.guide_purchases (user_id, guide_id);

alter table public.guides enable row level security;
alter table public.guide_days enable row level security;
alter table public.guide_stops enable row level security;
alter table public.guide_transports enable row level security;
alter table public.guide_purchases enable row level security;
alter table public.intercity_bus_routes enable row level security;
alter table public.guide_itinerary_requests enable row level security;

-- Public read published guides
create policy "Public published guides read"
  on public.guides for select
  using (published = true);

-- Public read guide structure for published guides
create policy "Public guide days read"
  on public.guide_days for select
  using (
    exists (
      select 1 from public.guides g
      where g.id = guide_id and g.published = true
    )
  );

create policy "Public guide stops read"
  on public.guide_stops for select
  using (
    exists (
      select 1 from public.guide_days d
      join public.guides g on g.id = d.guide_id
      where d.id = guide_day_id and g.published = true
    )
  );

create policy "Public guide transports read"
  on public.guide_transports for select
  using (
    exists (
      select 1 from public.guide_stops s
      join public.guide_days d on d.id = s.guide_day_id
      join public.guides g on g.id = d.guide_id
      where s.id = guide_stop_id and g.published = true
    )
  );

create policy "Public intercity routes read"
  on public.intercity_bus_routes for select
  using (active = true);

-- Purchased guide full access for owner
create policy "Guide purchases own select"
  on public.guide_purchases for select
  using (auth.uid() = user_id);

create policy "Guide purchases own insert"
  on public.guide_purchases for insert
  with check (auth.uid() = user_id);

-- Purchased users can read unpublished guide content they bought
create policy "Purchased guides read"
  on public.guides for select
  using (
    published = true
    or exists (
      select 1 from public.guide_purchases p
      where p.guide_id = id
        and p.user_id = auth.uid()
        and p.status = 'active'
        and (p.access_until is null or p.access_until > now())
    )
  );

create policy "Purchased guide days read"
  on public.guide_days for select
  using (
    exists (
      select 1 from public.guides g
      where g.id = guide_id
        and (
          g.published = true
          or exists (
            select 1 from public.guide_purchases p
            where p.guide_id = g.id
              and p.user_id = auth.uid()
              and p.status = 'active'
              and (p.access_until is null or p.access_until > now())
          )
        )
    )
  );

create policy "Purchased guide stops read"
  on public.guide_stops for select
  using (
    exists (
      select 1 from public.guide_days d
      join public.guides g on g.id = d.guide_id
      where d.id = guide_day_id
        and (
          g.published = true
          or exists (
            select 1 from public.guide_purchases p
            where p.guide_id = g.id
              and p.user_id = auth.uid()
              and p.status = 'active'
              and (p.access_until is null or p.access_until > now())
          )
        )
    )
  );

create policy "Purchased guide transports read"
  on public.guide_transports for select
  using (
    exists (
      select 1 from public.guide_stops s
      join public.guide_days d on d.id = s.guide_day_id
      join public.guides g on g.id = d.guide_id
      where s.id = guide_stop_id
        and (
          g.published = true
          or exists (
            select 1 from public.guide_purchases p
            where p.guide_id = g.id
              and p.user_id = auth.uid()
              and p.status = 'active'
              and (p.access_until is null or p.access_until > now())
          )
        )
    )
  );

create policy "Itinerary requests own"
  on public.guide_itinerary_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed Kosovo intercity routes
insert into public.intercity_bus_routes (origin, destination, route_name, departure_frequency, notes)
values
  ('Prishtina', 'Prizren', 'Prishtina → Prizren', 'Every 30–60 min', 'Main bus station — Lagja e Muhaxhereve'),
  ('Prishtina', 'Peja', 'Prishtina → Peja', 'Every 45–90 min', 'Via Fushë Kosovë'),
  ('Prishtina', 'Gjakova', 'Prishtina → Gjakova', 'Every 60 min', 'Direct coaches available'),
  ('Prishtina', 'Mitrovica', 'Prishtina → Mitrovica', 'Every 30–60 min', 'North & south connections'),
  ('Prishtina', 'Ferizaj', 'Prishtina → Ferizaj', 'Every 30 min', 'Frequent commuter route'),
  ('Prishtina', 'Gjilan', 'Prishtina → Gjilan', 'Every 30–45 min', 'Eastern Kosovo'),
  ('Prishtina', 'Brezovica', 'Prishtina → Brezovica', 'Seasonal / 2–3 daily', 'Ski season — check schedules'),
  ('Prishtina', 'Rugova', 'Prishtina → Rugova (Peja)', 'Via Peja + taxi', 'Transfer in Peja for canyon access')
on conflict do nothing;
