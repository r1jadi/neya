-- Close the legacy guestlist_entries client-insert escape hatch.
--
-- guestlist_entries is the door list. Entries are created exclusively by the
-- server-side sync from approved guestlist_requests (service role,
-- lib/guestlist/sync-entry.ts) — the venue staff workflows only read/update
-- them. The legacy "Guestlist entries own insert" policy (20240515120000)
-- let ANY authenticated user insert arbitrary rows into ANY guestlist via
-- PostgREST: fabricated door-list rows, fabricated checked-in entries,
-- planted group sizes, rows for other venues' events.
--
-- The client can no longer insert entries at all. The "own select" policy is
-- kept: /dashboard renders the user's own legacy entries. Venue staff keep
-- their select/update policies (20240521120000). Inserts remain possible for
-- the service role only.

drop policy if exists "Guestlist entries own insert" on public.guestlist_entries;

-- Defense in depth: the door list is never client-writable, even via future
-- policy drift. Only service role (or a future explicit staff insert policy)
-- may add rows.
alter table public.guestlist_entries enable row level security;

-- ---------------------------------------------------------------------------
-- Verification (SQL editor, anon/authenticated key):
--   1. insert into public.guestlist_entries (guestlist_id, user_id, full_name)
--        values ('<any-guestlist>', auth.uid(), 'Fake');
--      Expected: ERROR: new row violates row-level security policy
--   2. (authenticated)  select * from public.guestlist_entries
--        where user_id = auth.uid();
--      Expected: own rows still visible (dashboard unaffected).
-- ---------------------------------------------------------------------------