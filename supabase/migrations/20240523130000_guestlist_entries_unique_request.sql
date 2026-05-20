-- Full unique constraint so PostgREST upsert/sync can target guestlist_request_id

drop index if exists public.guestlist_entries_request_id_idx;

alter table public.guestlist_entries
  drop constraint if exists guestlist_entries_request_id_key;

alter table public.guestlist_entries
  add constraint guestlist_entries_request_id_key unique (guestlist_request_id);
