-- Venue categories are stored as text. Keep the legacy `club` value readable,
-- while normalizing it to the new canonical `nightclub` category for new data.
update public.venues set category = 'nightclub' where category = 'club';

alter table public.venues drop constraint if exists venues_category_check;
alter table public.venues add constraint venues_category_check check (category in (
  'nightclub', 'lounge', 'bar', 'rooftop', 'cafe', 'live_music', 'festival',
  'concert_hall', 'arena', 'stadium', 'open_air_venue', 'beach_club', 'pool_club',
  'restaurant', 'pub', 'cocktail_bar', 'wine_bar', 'jazz_club', 'theater', 'cinema',
  'gallery', 'cultural_center', 'community_space', 'warehouse', 'underground_venue',
  'event_hall', 'conference_center', 'hotel_venue', 'resort', 'park', 'outdoor_space',
  'private_venue', 'wedding_venue', 'university_venue', 'sports_venue', 'festival_ground',
  'clubbing_venue', 'music_venue', 'exhibition_space', 'rooftop_bar', 'food_hall', 'other'
));
