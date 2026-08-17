-- Discovery expansion. These columns enrich the existing events table; tickets,
-- reservations, guestlists, payments and QR flows continue to key off event_id.

alter table public.events
  add column if not exists city_slug text,
  add column if not exists category text not null default 'nightlife',
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_free boolean not null default false,
  add column if not exists submission_status text not null default 'approved';

-- Existing venue-backed events inherit their city. Venue-less events stay
-- Prishtina-first until their organizer supplies a city in the publisher form.
update public.events e
set city_slug = coalesce(v.city_slug, 'prishtina')
from public.venues v
where e.venue_id = v.id and e.city_slug is null;

update public.events set city_slug = 'prishtina' where city_slug is null;
alter table public.events alter column city_slug set default 'prishtina';
alter table public.events alter column city_slug set not null;

alter table public.events drop constraint if exists events_discovery_category_check;
alter table public.events add constraint events_discovery_category_check check (category in (
  'nightlife', 'dj_set', 'concert', 'festival', 'live_music', 'student', 'sports',
  'culture', 'art', 'theatre', 'comedy', 'food_drink', 'wellness', 'workshop',
  'family', 'community', 'outdoor', 'other'
));
alter table public.events drop constraint if exists events_submission_status_check;
alter table public.events add constraint events_submission_status_check
  check (submission_status in ('draft', 'pending_review', 'approved', 'rejected'));

create index if not exists events_discovery_public_city_start_idx
  on public.events (city_slug, starts_at)
  where is_listed_public = true and submission_status = 'approved';
create index if not exists events_discovery_category_idx on public.events (category);
create index if not exists events_discovery_tags_gin_idx on public.events using gin (tags);
