import { loadEnv } from "./.tmp-env.mjs";
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function q(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const events = await q(
  `events?select=id,title,slug,is_free,ticket_from_eur,reservation_price_eur,reservations_enabled,requires_online_payment,allows_pay_at_venue,capacity,is_listed_public,venue_id,starts_at&order=starts_at.desc&limit=12`
);
const tickets = await q(`tickets?select=id,event_id,tier_name,price_cents,status,quantity_total,quantity_sold,quantity_reserved&limit=100`);
const venues = await q(`venues?select=id,name,reservations_enabled,reservation_price_eur,requires_online_payment,allows_pay_at_venue&limit=30`);

for (const e of events) {
  const evTickets = tickets.filter((t) => t.event_id === e.id);
  console.log(
    `\nEVENT ${e.title}  [${e.slug}] listed=${e.is_listed_public} free=${e.is_free} from=${e.ticket_from_eur} resPrice=${e.reservation_price_eur} resEnabled=${e.reservations_enabled} reqOnline=${e.requires_online_payment} payAtVenue=${e.allows_pay_at_venue} cap=${e.capacity} venue=${e.venue_id?.slice(0, 8)}`
  );
  for (const t of evTickets) {
    console.log(`   tier ${t.tier_name}: ${t.price_cents}c ${t.status} qty=${t.quantity_total} sold=${t.quantity_sold} resv=${t.quantity_reserved}`);
  }
}
console.log(`\nVENUES (${venues.length}):`);
for (const v of venues) {
  console.log(`   ${v.name}: resEnabled=${v.reservations_enabled} resPrice=${v.reservation_price_eur} reqOnline=${v.requires_online_payment} payAtVenue=${v.allows_pay_at_venue}`);
}