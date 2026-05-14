-- Reviews: live atmosphere votes (recalculate event score via trigger)
-- Check-ins: public visibility for "who's here" counts
-- Venue / event inserts for authenticated venue owners (pending venues stay unlisted until approved)

-- Reviews policies (RLS was enabled with no policies = blocked)
drop policy if exists "reviews select recent" on public.reviews;
create policy "reviews select recent" on public.reviews for select using (created_at > now() - interval '3 days');

drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert to authenticated with check (auth.uid() = user_id);

-- Aggregate atmosphere on new review (runs as definer; updates events row)
create or replace function public.apply_review_to_event_atmosphere()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id is null then
    return new;
  end if;
  update public.events e
  set
    atmosphere_rating = coalesce(
      (
        select round(avg(r.overall_vibe::numeric), 1)
        from public.reviews r
        where r.event_id = new.event_id
          and r.overall_vibe is not null
      ),
      e.atmosphere_rating
    ),
    updated_at = now()
  where e.id = new.event_id;
  return new;
end;
$$;

drop trigger if exists trg_reviews_atmosphere on public.reviews;
create trigger trg_reviews_atmosphere
  after insert on public.reviews
  for each row execute function public.apply_review_to_event_atmosphere();

-- Check-ins
drop policy if exists "checkins insert own" on public.checkins;
create policy "checkins insert own" on public.checkins for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "checkins select own" on public.checkins;
create policy "checkins select own" on public.checkins for select to authenticated using (auth.uid() = user_id);

drop policy if exists "checkins select public window" on public.checkins;
create policy "checkins select public window" on public.checkins for select using (
  visibility = 'public'
  and created_at > now() - interval '18 hours'
);

-- Atmosphere history (optional charting / realtime)
drop policy if exists "atmosphere_snapshots read" on public.atmosphere_snapshots;
create policy "atmosphere_snapshots read" on public.atmosphere_snapshots for select using (true);

-- Business: create venue (waits for admin approval — still not public until approved)
drop policy if exists "venues owner insert" on public.venues;
create policy "venues owner insert" on public.venues for insert to authenticated with check (
  auth.uid() = owner_id
  and coalesce(approved, false) = false
);

-- Business: create events only for venues you own
drop policy if exists "events owner insert" on public.events;
create policy "events owner insert" on public.events for insert to authenticated with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
);

-- Stories: venue owners can post ephemeral content
drop policy if exists "stories owner insert" on public.stories;
create policy "stories owner insert" on public.stories for insert to authenticated with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.owner_id = auth.uid()
  )
);

-- Approximate Prishtina map pins for seeded venues (safe to re-run)
update public.venues
set lat = 42.6640, lng = 21.1645, updated_at = now()
where slug = 'soma-pr';

update public.venues
set lat = 42.6558, lng = 21.1487, updated_at = now()
where slug = 'hamam-jazz';

update public.venues
set lat = 42.6705, lng = 21.1720, updated_at = now()
where slug = 'rooftop-42';
