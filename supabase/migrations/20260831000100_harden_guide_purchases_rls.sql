-- Hardening: guide purchases must never be self-issued as active.
--
-- Previously any authenticated user could INSERT or UPDATE their own
-- guide_purchases rows with status = 'active' (and any future access_until).
-- The guide-content policies ("Purchased guides read" and its day/stop/
-- transport variants) then unlocked unpublished and paid guide content for
-- those rows — a direct paywall bypass.
--
-- Now users may only insert rows with status = 'pending' (a hold with no
-- access), and may never update purchase rows directly. Activating a
-- purchase (free-guide grants, future payment confirmations) is a
-- service-role/server-action decision which bypasses RLS.

drop policy if exists "Guide purchases own update" on public.guide_purchases;

drop policy if exists "Guide purchases own insert" on public.guide_purchases;
create policy "Guide purchases own insert"
  on public.guide_purchases
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');