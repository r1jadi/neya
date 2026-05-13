-- Run after seed_prishtina.sql: guestlists + tickets + default ticket tier per event

insert into public.guestlists (event_id, name, capacity, is_vip)
select e.id, 'Main list', 250, false
from public.events e
where not exists (select 1 from public.guestlists g where g.event_id = e.id);

insert into public.tickets (event_id, tier_name, price_cents, currency, quantity_total, quantity_sold)
select e.id, 'General admission', coalesce((e.ticket_from_eur * 100)::integer, 1000), 'EUR', 400, 0
from public.events e
where e.ticket_from_eur is not null
  and not exists (select 1 from public.tickets t where t.event_id = e.id);
