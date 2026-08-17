-- Venue "This Week" highlight posts.
--
-- Admins publish short weekly updates per venue (upcoming DJ, special night,
-- promotion, themed event). A venue can have at most ONE active highlight for
-- any given week — enforced by a partial exclusion constraint (btree_gist)
-- over the active rows; past/inactive rows may coexist for history.
--
-- Highlights auto-expire on the frontend via week_start/week_end (no manual
-- cleanup needed). Public readers only ever see active rows (RLS), admins
-- manage everything via auth_is_admin().

create extension if not exists btree_gist;

create table if not exists public.venue_weekly_highlights (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  title text not null,
  content text not null,
  image_url text,
  week_start date not null,
  week_end date not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_weekly_highlights_week_order check (week_end >= week_start),
  constraint venue_weekly_highlights_no_overlap_active exclude using gist (
    venue_id with =,
    daterange(week_start, week_end, '[]') with &&
  ) where (is_active)
);

create index if not exists venue_weekly_highlights_venue_idx on public.venue_weekly_highlights (venue_id);
create index if not exists venue_weekly_highlights_active_week_idx on public.venue_weekly_highlights (week_start, week_end) where is_active = true;

-- RLS
alter table public.venue_weekly_highlights enable row level security;

-- Public can only read currently published highlights; admins write.
drop policy if exists "venue_weekly_highlights public read" on public.venue_weekly_highlights;
create policy "venue_weekly_highlights public read" on public.venue_weekly_highlights
  for select using (is_active = true);

drop policy if exists "venue_weekly_highlights admin insert" on public.venue_weekly_highlights;
create policy "venue_weekly_highlights admin insert" on public.venue_weekly_highlights
  for insert to authenticated with check (public.auth_is_admin());

drop policy if exists "venue_weekly_highlights admin update" on public.venue_weekly_highlights;
create policy "venue_weekly_highlights admin update" on public.venue_weekly_highlights
  for update to authenticated using (public.auth_is_admin());

drop policy if exists "venue_weekly_highlights admin delete" on public.venue_weekly_highlights;
create policy "venue_weekly_highlights admin delete" on public.venue_weekly_highlights
  for delete to authenticated using (public.auth_is_admin());
