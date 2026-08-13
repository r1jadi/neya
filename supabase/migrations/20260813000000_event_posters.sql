-- Generated event posters live in the existing public neya-media bucket.
-- Keep poster metadata on the event so a regenerated poster replaces the prior one.
alter table public.events
  add column if not exists poster_url text,
  add column if not exists poster_generated_at timestamptz;
