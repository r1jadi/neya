-- Optional details used by the public venue landing pages.
alter table public.venues
  add column if not exists website_url text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists capacity integer check (capacity is null or capacity >= 0);
