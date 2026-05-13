-- NEYA initial schema — Prishtina-first nightlife platform
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "uuid-ossp";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  city_slug text default 'prishtina',
  age smallint,
  gender text,
  interests text[] default '{}',
  music_genres text[] default '{}',
  venue_prefs uuid[] default '{}',
  onboarding_complete boolean default false,
  is_premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city_slug text not null default 'prishtina',
  category text not null,
  description text,
  address text,
  lat double precision,
  lng double precision,
  image_url text,
  price_level smallint default 2 check (price_level between 1 and 4),
  owner_id uuid references public.profiles (id),
  approved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  venue_id uuid not null references public.venues (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  genre text,
  image_url text,
  ticket_url text,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  party_size smallint not null default 2,
  deposit_cents integer,
  stripe_payment_intent text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.guestlists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  capacity integer,
  is_vip boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.guestlist_entries (
  id uuid primary key default gen_random_uuid(),
  guestlist_id uuid not null references public.guestlists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'waitlist')),
  qr_code text,
  created_at timestamptz default now(),
  unique (guestlist_id, user_id)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tier_name text not null,
  price_cents integer not null,
  currency text not null default 'EUR',
  quantity_total integer,
  quantity_sold integer default 0,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_checkout_session text,
  qr_payload text,
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  visibility text not null default 'friends' check (visibility in ('private', 'friends', 'public')),
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  music_quality smallint,
  crowd_energy smallint,
  line_wait smallint,
  overall_vibe smallint,
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  metric text not null,
  value numeric,
  dimensions jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  stripe_id text,
  amount_cents integer not null,
  currency text not null default 'EUR',
  kind text not null,
  status text not null default 'succeeded',
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null default 'email',
  template text not null,
  payload jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_subscription_id text,
  tier text not null default 'premium',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  verb text not null,
  object_type text not null,
  object_id uuid,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- Atmosphere aggregates (live ratings)
create table if not exists public.atmosphere_snapshots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  score numeric not null,
  sample_size integer default 0,
  captured_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.reservations enable row level security;
alter table public.guestlists enable row level security;
alter table public.guestlist_entries enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.checkins enable row level security;
alter table public.reviews enable row level security;
alter table public.stories enable row level security;
alter table public.analytics enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.friendships enable row level security;
alter table public.activity_feed enable row level security;
alter table public.atmosphere_snapshots enable row level security;

-- Basic policies (tighten for production — service role for admin writes)
create policy "Public venues read" on public.venues for select using (approved = true);
create policy "Public events read" on public.events for select using (true);
create policy "Profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "Profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "Profiles self update" on public.profiles for update using (auth.uid() = id);

create policy "Stories public read" on public.stories for select using (expires_at is null or expires_at > now());

-- Realtime publication (enable in Supabase dashboard for specific tables)
-- alter publication supabase_realtime add table public.atmosphere_snapshots;
