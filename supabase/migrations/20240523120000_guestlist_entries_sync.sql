-- Sync guestlist_requests (approved) → guestlist_entries (door list)

alter table public.guestlist_entries
  alter column user_id drop not null;

alter table public.guestlist_entries
  add column if not exists guestlist_request_id uuid references public.guestlist_requests (id) on delete cascade,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists group_size smallint default 1 check (group_size >= 1 and group_size <= 20);

alter table public.guestlist_entries drop constraint if exists guestlist_entries_guestlist_id_user_id_key;

create unique index if not exists guestlist_entries_request_id_idx
  on public.guestlist_entries (guestlist_request_id)
  where guestlist_request_id is not null;

create unique index if not exists guestlist_entries_guestlist_user_idx
  on public.guestlist_entries (guestlist_id, user_id)
  where user_id is not null;

create index if not exists guestlist_entries_guestlist_id_idx on public.guestlist_entries (guestlist_id);
