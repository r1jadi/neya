-- Optional: story rings for the landing page (requires venues from seed_prishtina.sql)

insert into public.stories (venue_id, media_url, media_type, expires_at)
select v.id, v.image_url, 'image', now() + interval '20 hours'
from public.venues v
where v.slug in ('soma-pr', 'rooftop-42', 'hamam-jazz')
  and not exists (select 1 from public.stories s where s.venue_id = v.id and s.expires_at > now());
