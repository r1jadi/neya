create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null check (source_type in ('official_organizer', 'official_venue', 'official_website', 'official_instagram', 'ticketing_provider', 'other')),
  label text,
  url text not null,
  is_verified boolean not null default false,
  verification_note text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, url)
);
create index if not exists event_sources_event_idx on public.event_sources(event_id);
alter table public.event_sources enable row level security;
create policy "Public sources for listed events" on public.event_sources for select using (
  exists (select 1 from public.events e where e.id = event_id and e.is_listed_public = true)
);
