-- Sample Prishtina venues + events (run in Supabase SQL editor after migrations)
-- Sets approved = true so public RLS allows reads.

insert into public.venues (
  slug, name, city_slug, category, description, image_url, price_level, approved,
  atmosphere_score, crowd_count, is_live
)
values
  (
    'soma-pr',
    'SOMA',
    'prishtina',
    'club',
    'Main room techno & house.',
    'https://images.unsplash.com/photo-1574391884726-a410171917de?auto=format&fit=crop&w=1200&q=80',
    3,
    true,
    9.1,
    420,
    true
  ),
  (
    'hamam-jazz',
    'Hamam Jazz Club',
    'prishtina',
    'live_music',
    'Intimate live sets.',
    'https://images.unsplash.com/photo-1514525253161-13a684bc8776?auto=format&fit=crop&w=1200&q=80',
    2,
    true,
    8.6,
    156,
    true
  ),
  (
    'rooftop-42',
    'Rooftop 42',
    'prishtina',
    'rooftop',
    'Sunset sessions.',
    'https://images.unsplash.com/photo-1514933651103-005eec06c4b3?auto=format&fit=crop&w=1200&q=80',
    3,
    true,
    8.9,
    210,
    false
  )
on conflict (slug) do nothing;

insert into public.events (
  slug, venue_id, title, description, starts_at, genre, image_url, is_featured,
  crowd_count, atmosphere_rating, live_status, fomo_line, reservation_spots_left, ticket_from_eur
)
select
  'after-midnight-soma',
  v.id,
  'After Midnight — SOMA',
  'Peak-time techno.',
  now() + interval '4 hours',
  'techno',
  'https://images.unsplash.com/photo-1574391884726-a410171917de?auto=format&fit=crop&w=1200&q=80',
  true,
  312,
  9.3,
  true,
  '120 people viewed this in the last hour',
  2,
  12
from public.venues v where v.slug = 'soma-pr'
on conflict (slug) do nothing;

insert into public.events (
  slug, venue_id, title, description, starts_at, genre, image_url, is_featured,
  crowd_count, atmosphere_rating, live_status, fomo_line, reservation_spots_left, ticket_from_eur
)
select
  'saturday-rooftop-sessions',
  v.id,
  'Saturday Rooftop Sessions',
  'House & disco.',
  now() + interval '1 day',
  'house',
  'https://images.unsplash.com/photo-1514933651103-005eec06c4b3?auto=format&fit=crop&w=1200&q=80',
  true,
  88,
  8.7,
  false,
  'Trending in Prishtina',
  6,
  15
from public.venues v where v.slug = 'rooftop-42'
on conflict (slug) do nothing;

insert into public.events (
  slug, venue_id, title, description, starts_at, genre, image_url, is_featured,
  crowd_count, atmosphere_rating, live_status, fomo_line, ticket_from_eur
)
select
  'student-night-xyz',
  v.id,
  'Student Night — XYZ',
  'Hip-hop & open format.',
  now() + interval '2 days',
  'hip-hop',
  'https://images.unsplash.com/photo-1514525253161-13a684bc8776?auto=format&fit=crop&w=1200&q=80',
  false,
  240,
  8.4,
  true,
  'Line estimated: 18 min',
  8
from public.venues v where v.slug = 'hamam-jazz'
on conflict (slug) do nothing;
