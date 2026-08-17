-- Matches saved_events: user-owned bookmarks of existing venue records.
create table if not exists public.saved_venues (
  user_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
alter table public.saved_venues enable row level security;
create policy "saved_venues own select" on public.saved_venues for select to authenticated using (auth.uid() = user_id);
create policy "saved_venues own insert" on public.saved_venues for insert to authenticated with check (auth.uid() = user_id);
create policy "saved_venues own delete" on public.saved_venues for delete to authenticated using (auth.uid() = user_id);
