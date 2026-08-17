-- Public proposals stay in the canonical events table so moderation promotes
-- the exact same record into NEYA discovery and commerce.
alter table public.events
  add column if not exists venue_name text,
  add column if not exists organizer_name text,
  add column if not exists organizer_email text,
  add column if not exists organizer_phone text,
  add column if not exists source_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz;

alter table public.events drop constraint if exists events_submission_status_check;
alter table public.events add constraint events_submission_status_check check (submission_status in (
  'draft', 'submitted', 'pending_review', 'approved', 'rejected', 'published', 'archived'
));
create index if not exists events_submission_moderation_idx on public.events (submission_status, submitted_at desc);
