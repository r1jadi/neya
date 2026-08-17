-- "My Night" planner.
--
-- night_plans       — a user's active plan (share_token null, one per user) or a
--                     shared snapshot (share_token set, immutable copy). Snapshots
--                     keep working even after the owner changes their active plan.
-- night_plan_stops  — ordered references to venues/events (never duplicated data).
--                     Max 3 stops (position 0..2, enforced by check + server logic).
--
-- RLS: users manage only their own plans/stops; shared snapshots are publicly
-- readable via their token. No private plan is ever exposed by a public query.

create table if not exists public.night_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null default 'My Night',
  plan_date date,
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.night_plan_stops (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.night_plans (id) on delete cascade,
  position smallint not null default 0,
  venue_id uuid references public.venues (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint night_plan_stops_max check (position between 0 and 2),
  constraint night_plan_stops_one_ref check (
    (venue_id is not null and event_id is null)
    or (event_id is not null and venue_id is null)
  )
);

-- A user has at most one active (private) plan at a time. Shared snapshots
-- (share_token set) are exempt so the same user can have many shared copies.
create unique index if not exists night_plans_one_active
  on public.night_plans (user_id)
  where share_token is null and user_id is not null;

create index if not exists night_plan_stops_plan_idx on public.night_plan_stops (plan_id, position);

-- RLS
alter table public.night_plans enable row level security;
alter table public.night_plan_stops enable row level security;

-- Plans: own rows only.
drop policy if exists "night_plans own select" on public.night_plans;
create policy "night_plans own select" on public.night_plans
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "night_plans own insert" on public.night_plans;
create policy "night_plans own insert" on public.night_plans
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "night_plans own update" on public.night_plans;
create policy "night_plans own update" on public.night_plans
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "night_plans own delete" on public.night_plans;
create policy "night_plans own delete" on public.night_plans
  for delete to authenticated using (auth.uid() = user_id);

-- Shared snapshots are publicly readable through their token (no auth required).
drop policy if exists "night_plans shared read" on public.night_plans;
create policy "night_plans shared read" on public.night_plans
  for select using (share_token is not null);

-- Stops: manage through own plans.
drop policy if exists "night_plan_stops own select" on public.night_plan_stops;
create policy "night_plan_stops own select" on public.night_plan_stops
  for select to authenticated
  using (exists (
    select 1 from public.night_plans p
    where p.id = plan_id and p.user_id = auth.uid()
  ));

drop policy if exists "night_plan_stops own insert" on public.night_plan_stops;
create policy "night_plan_stops own insert" on public.night_plan_stops
  for insert to authenticated
  with check (exists (
    select 1 from public.night_plans p
    where p.id = plan_id and p.user_id = auth.uid()
  ));

drop policy if exists "night_plan_stops own update" on public.night_plan_stops;
create policy "night_plan_stops own update" on public.night_plan_stops
  for update to authenticated
  using (exists (
    select 1 from public.night_plans p
    where p.id = plan_id and p.user_id = auth.uid()
  ));

drop policy if exists "night_plan_stops own delete" on public.night_plan_stops;
create policy "night_plan_stops own delete" on public.night_plan_stops
  for delete to authenticated
  using (exists (
    select 1 from public.night_plans p
    where p.id = plan_id and p.user_id = auth.uid()
  ));

-- Stops of shared snapshots are publicly readable.
drop policy if exists "night_plan_stops shared read" on public.night_plan_stops;
create policy "night_plan_stops shared read" on public.night_plan_stops
  for select using (exists (
    select 1 from public.night_plans p
    where p.id = plan_id and p.share_token is not null
  ));
