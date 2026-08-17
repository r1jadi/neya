-- DEVELOPMENT / TEST SEED — do NOT run against production.
--
-- Creates a small set of fictional artists so the directory, profiles, follow
-- buttons and event lineups can be tried out locally. All social URLs are
-- deliberately placeholder (example.com) — no real-looking fake profiles.
-- Idempotent: re-running skips artists that already exist by slug.

insert into public.artists (slug, name, short_bio, bio, genres, profile_image, is_verified, is_featured)
values
  ('dj-aura', 'DJ Aura', 'Prishtina-based selector moving between deep house and melodic techno.',
   'DJ Aura has been a fixture of the Prishtina after-hours scene since 2019, known for warm, groove-first sets that build slowly and land hard. Resident at local nights across the city, she has shared stages with touring acts and runs a monthly radio show.',
   array['deep_house', 'melodic_techno'], null, true, true),
  ('nora-bass', 'Nora Bass', 'Bass-heavy sets with a Balkan soul.',
   'Nora Bass cuts through with driving basslines and a sharp ear for club rhythm. Her sets blend UK garage, bass house and Balkan percussion into something that feels both familiar and new.',
   array['bass_house', 'uk_garage', 'balkan'], null, false, true),
  ('leo-vincent', 'Leo Vincent', 'House & disco edits for golden-hour rooms.',
   'Leo Vincent is a daytime-to-nighttime DJ with a crate of disco, funk and vocal house. Expect bright chords, classic edits and a dancefloor that never sits down.',
   array['house', 'disco', 'funk'], null, false, false),
  ('k-tribe', 'K-Tribe', 'Hip-hop, trap and R&B — heavy on the low end.',
   'K-Tribe brings the energy of the city hip-hop scene to the club: trap drums, R&B hooks and a crew-first attitude. Also produces for local artists.',
   array['hip_hop', 'trap', 'r_and_b'], null, false, false),
  ('mira-sound', 'Mira Sound', 'Afro house and global rhythms, sunrise included.',
   'Mira Sound specialises in Afro house, amapiano and Latin-leaning rhythms that carry a room from peak time to sunrise.',
   array['afro_house', 'latin'], null, false, true)
on conflict (slug) do nothing;
