-- Places data layer — day-part availability for venues.
--
-- The /places experience groups venues into all-day contexts (Breakfast,
-- Coffee, Lunch, Work/Study, Dinner, Drinks, Nightlife). The grouping was
-- previously derived entirely on the frontend from a hardcoded
-- category → context map, which left venues whose category wasn't in the
-- map (e.g. a rooftop) invisible to daytime sections. This adds a
-- per-venue "when is this place open" property directly on the venues
-- table — the same simple text[] pattern already used for
-- music_genres / tags — so the Places page is driven by real venue data.
-- No duplicate venues or separate lookup tables are created.

alter table public.venues
  add column if not exists day_parts text[] not null default '{}';

-- Only the four day parts used by Places may be stored.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'venues_day_parts_check'
    and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_day_parts_check
      check (day_parts <@ array['morning','daytime','evening','late_night']);
  end if;
end $$;

-- Day parts for the current catalogue so Places is immediately populated.
-- Explicit per venue; edit freely as real opening hours become available.
update public.venues set day_parts = array['evening','late_night'] where day_parts = '{}' and category in ('nightclub', 'club', 'bar', 'live_music', 'music_venue', 'jazz_club', 'underground_venue', 'clubbing_venue', 'warehouse', 'lounge');
update public.venues set day_parts = array['morning','daytime','evening'] where day_parts = '{}' and category in ('cafe', 'restaurant', 'food_hall', 'rooftop', 'rooftop_bar');
update public.venues set day_parts = array['morning','daytime'] where day_parts = '{}' and category in ('park', 'gallery', 'exhibition_space', 'cultural_center', 'community_space', 'conference_center', 'university_venue', 'sports_venue');