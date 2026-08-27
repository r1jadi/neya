// Smoke test: create an event through the real saveEvent server action.
import { ACTIONS, adminPost, db, localInput, log } from "./.tmp-events-harness.mjs";

const title = `Smoke ${Date.now().toString(36)}`;
const fd = {
  title,
  venue_id: "",
  venue_name: "Smoke Location",
  starts_at: localInput(45),
  ends_at: "",
  genre: "techno",
  category: "nightlife",
  city_slug: "prishtina",
  tags: "test",
  is_free: "on",
  image_url: "",
  performers: "[]",
  artist_ids: "",
  capacity: "",
  ticket_from_eur: "",
  reservation_price_eur: "0",
  reservations_enabled: "true",
  requires_online_payment: "false",
  allows_pay_at_venue: "true",
  is_listed_public: "on",
  is_listed_public_off: "off",
  is_featured: "off",
  is_hidden_premium: "off",
  description: "smoke",
  tickets_json: "[]",
  tickets_original_ids: "",
};
// order matters for is_listed_public: "on" must come first when checked
const fdOrdered = { ...fd, is_listed_public: "on" };

const res = await adminPost(ACTIONS.saveEvent, fdOrdered);
log("saveEvent ->", res.status, res.location ?? "");
const events = await db(`events?select=id,title,slug,venue_name,is_free,ticket_from_eur,reservation_price_eur,reservations_enabled,is_listed_public,submission_status,capacity&title=eq.${encodeURIComponent(title)}`);
if (!events.length) {
  log("FAIL: event not found in DB", res.text);
  process.exit(1);
}
console.log(JSON.stringify(events[0], null, 1));