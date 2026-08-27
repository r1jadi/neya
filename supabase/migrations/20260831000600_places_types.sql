-- Places data layer — explicit Places section assignments for venues.
--
-- /places groups venues into sections (Breakfast, Coffee, Lunch, Work &
-- Study, Dinner, Drinks, Nightlife). This adds an explicit per-venue list of
-- sections assigned by an admin in the venue form, so a venue can appear
-- under several sections at once (e.g. Lunch + Drinks + Nightlife).
--
-- The column follows the same simple text[] pattern already used by
-- day_parts / music_genres, and lives on the existing venues table — no
-- duplicate venues or separate lookup tables.
--
-- Existing rows are NOT backfilled: a venue with an empty assignment keeps
-- the previous deterministic inference (day_parts, then category mapping)
-- until an admin explicitly assigns sections.

alter table public.venues
  add column if not exists places_types text[] not null default '{}';

-- Only the seven Places sections may be stored.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'venues_places_types_check'
    and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_places_types_check
      check (places_types <@ array['breakfast','coffee','lunch','work_study','dinner','drinks','nightlife']);
  end if;
end $$;