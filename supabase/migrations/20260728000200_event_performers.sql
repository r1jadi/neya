-- Structured performers replace the legacy text-only DJ lineup while preserving existing data.
alter table public.events
  add column if not exists performers jsonb not null default '[]'::jsonb;

update public.events
set performers = coalesce(
  (
    select jsonb_agg(jsonb_build_object('name', performer_name))
    from unnest(dj_lineup) as performer_name
  ),
  '[]'::jsonb
)
where coalesce(jsonb_array_length(performers), 0) = 0
  and coalesce(array_length(dj_lineup, 1), 0) > 0;
