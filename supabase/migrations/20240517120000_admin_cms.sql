-- Admin CMS columns + public media bucket

alter table public.venues add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
alter table public.venues add column if not exists music_genres text[] not null default '{}';
alter table public.venues add column if not exists opening_hours jsonb;
alter table public.venues add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.venues add column if not exists reservations_enabled boolean not null default true;
alter table public.venues add column if not exists vip_enabled boolean not null default false;
alter table public.venues add column if not exists is_featured boolean not null default false;
alter table public.venues add column if not exists is_trending boolean not null default false;
alter table public.venues add column if not exists rejected boolean not null default false;

alter table public.events add column if not exists dj_lineup text[] not null default '{}';
alter table public.events add column if not exists capacity integer;

insert into storage.buckets (id, name, public)
values ('neya-media', 'neya-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read neya-media" on storage.objects;
create policy "Public read neya-media"
  on storage.objects for select
  using (bucket_id = 'neya-media');
