-- Discovery uses the established analytics table and existing event/venue records.
-- These partial indexes match public discovery, city and venue programme queries.
create index if not exists events_discovery_city_published_start_idx
  on public.events (city_slug, starts_at)
  where is_listed_public = true and submission_status in ('approved', 'published');

create index if not exists events_discovery_venue_published_start_idx
  on public.events (venue_id, starts_at)
  where is_listed_public = true and submission_status in ('approved', 'published');

create index if not exists analytics_metric_created_at_idx
  on public.analytics (metric, created_at desc);

create index if not exists analytics_event_metric_created_at_idx
  on public.analytics (event_id, metric, created_at desc)
  where event_id is not null;

create index if not exists analytics_venue_metric_created_at_idx
  on public.analytics (venue_id, metric, created_at desc)
  where venue_id is not null;
