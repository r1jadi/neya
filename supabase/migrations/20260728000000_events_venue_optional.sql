-- Events may be announced before a venue is confirmed.
alter table public.events
  alter column venue_id drop not null;

-- Preserve the existing ownership rule for assigned venues while allowing
-- non-venue partner accounts to publish an unassigned event.
drop policy if exists "events owner insert" on public.events;
create policy "events owner insert" on public.events for insert to authenticated with check (
  (
    venue_id is null
    or exists (
      select 1
      from public.venues v
      where v.id = venue_id
        and v.owner_id = auth.uid()
    )
  )
  and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'venue'
  )
);
