-- Discovery / FOMO fields for feed cards (safe to re-run)

alter table public.events add column if not exists crowd_count integer not null default 0;
alter table public.events add column if not exists atmosphere_rating numeric(4,1) not null default 8.5;
alter table public.events add column if not exists live_status boolean not null default false;
alter table public.events add column if not exists fomo_line text;
alter table public.events add column if not exists reservation_spots_left integer;
alter table public.events add column if not exists ticket_from_eur numeric(10,2);

alter table public.venues add column if not exists crowd_count integer not null default 0;
alter table public.venues add column if not exists atmosphere_score numeric(4,1);
alter table public.venues add column if not exists is_live boolean not null default false;
