-- Weekly "This Weekend" email digest.
--
-- 1. Opt-out flag on profiles (respects existing RLS: users can update their
--    own row; the service role used by the Edge Function bypasses RLS).
-- 2. Send tracking so the weekly job is idempotent: week_start is unique and
--    the job claims the week with an insert before sending anything.
--
-- Scheduling: Vercel Cron (no Supabase Edge Function needed).
--   vercel.json runs /api/cron/weekly-digest daily at 16:30 UTC (17:30 CET /
--   18:30 CEST in Prishtina — within Vercel Hobby's tolerance of Thursday
--   evening). The endpoint itself verifies it is Thursday in Prishtina and
--   that the week has not already been processed; the DB row below is the
--   source of truth for duplicate prevention, so even a misconfigured
--   schedule can never send twice for the same week.
--
--   Secrets (Vercel project env): CRON_SECRET (already used by the
--   reconcile sweep), RESEND_API_KEY, RESEND_FROM, DIGEST_SIGNING_SECRET,
--   DIGEST_TOKEN_TTL_DAYS (optional, default 90).

alter table public.profiles
  add column if not exists digest_opt_out boolean not null default false;

create table if not exists public.weekly_digest_sends (
  id uuid primary key default gen_random_uuid(),
  -- Calendar date (Europe/Belgrade) of the Friday the digest covers.
  week_start date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  events_count integer not null default 0,
  recipient_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'skipped', 'failed')),
  error text,
  unique (week_start)
);

create index if not exists weekly_digest_sends_week_start_idx
  on public.weekly_digest_sends (week_start);

-- Only the service role (Edge Function / unsubscribe endpoint) touches this.
alter table public.weekly_digest_sends enable row level security;
