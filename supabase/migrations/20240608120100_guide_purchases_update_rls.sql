-- Allow users to update their own guide purchases (upsert, checkout retries, Stripe session id).

drop policy if exists "Guide purchases own update" on public.guide_purchases;
create policy "Guide purchases own update"
  on public.guide_purchases for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
