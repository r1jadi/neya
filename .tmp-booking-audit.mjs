// NEYA booking audit: admin-configured event -> public page -> user booking ->
// backend verification. Fails loudly on any display-vs-backend mismatch.
import { ACTIONS, adminPost, db, dbDelete, localInput, log, userRpc } from "./.tmp-events-harness.mjs";

const BOOKING = {
  createReservation: "409e633bd5d5992f688103753320e8593b162d4809",
  createTicketCheckout: "403c5c3fc70806995e6f62b3102123214878a76c1e",
};

const VENUE_ID = "0ae1c013-5e17-444b-aaf3-fe3abb2b3e25"; // Audit Matrix Arena

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    log(`  PASS ${name}`);
  } else {
    fail++;
    failures.push(`${name} ${detail}`);
    log(`  FAIL ${name} ${detail}`);
  }
}

async function getPage(path) {
  const res = await fetch(`http://localhost:3000${path}`, { redirect: "manual" });
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/&ndash;|&#x2013;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
  return { status: res.status, text, raw: html };
}

// Event form payload builder mirroring the admin EventForm submission.
function eventFields({ title, venueId = "", venueName = "", tickets = [], isFree = true, ticketFromEur = "", capacity = "", resPrice = "", resEnabled = "true", reqOnline = "false", payAtVenue = "true", listed = true }) {
  const fields = {
    title,
    venue_id: venueId,
    venue_name: venueName,
    starts_at: localInput(40),
    ends_at: "",
    genre: "techno",
    category: "nightlife",
    city_slug: "prishtina",
    tags: "audit",
    description: "AUDIT scenario",
    image_url: "",
    performers: "[]",
    artist_ids: "",
    capacity,
    ticket_from_eur: ticketFromEur,
    reservation_price_eur: resPrice,
    reservations_enabled: resEnabled,
    requires_online_payment: reqOnline,
    allows_pay_at_venue: payAtVenue,
    is_featured: "off",
    is_hidden_premium: "off",
    tickets_json: JSON.stringify(tickets),
    tickets_original_ids: "",
  };
  if (listed) fields.is_listed_public = ["on", "off"];
  else fields.is_listed_public = ["off", "off"];
  fields.is_free = isFree ? "on" : "off";
  return fields;
}

async function createEvent(fields) {
  const res = await adminPost(ACTIONS.saveEvent, fields);
  const title = fields.title;
  const events = await db(`events?select=id,slug,title,is_free,ticket_from_eur,reservation_price_eur,reservations_enabled,requires_online_payment,allows_pay_at_venue,capacity,venue_id,venue_name,is_listed_public&title=eq.${encodeURIComponent(title)}`);
  if (!events.length) throw new Error(`event not created: ${res.location}`);
  return { event: events[0], res };
}

async function deleteEventDeep(eventId) {
  const tickets = await db(`tickets?select=id&event_id=eq.${eventId}`);
  const resvs = await db(`reservations?select=id&event_id=eq.${eventId}`);
  for (const t of tickets) {
    await db(`ticket_orders?select=id&ticket_id=eq.${t.id}`)
      .catch(() => [])
      .then((orders) => Promise.all(orders.map((o) => dbDelete("ticket_payment_attempts", `ticket_order_id=eq.${o.id}`).catch(() => null))));
    await dbDelete("ticket_orders", `ticket_id=eq.${t.id}`).catch(() => null);
  }
  for (const r of resvs) await dbDelete("reservation_payment_attempts", `reservation_id=eq.${r.id}`).catch(() => null);
  await dbDelete("tickets", `event_id=eq.${eventId}`).catch(() => null);
  await dbDelete("reservations", `event_id=eq.${eventId}`).catch(() => null);
  await dbDelete("events", `id=eq.${eventId}`).catch(() => null);
}

const SUMMARY = [];

// ============ S1: Free event, free reservation, no venue + custom location ============
log("=== S1 Free event + free reservation (no venue / custom location) ===");
{
  const { event } = await createEvent(eventFields({ title: "AUDIT S1 FreeRes", venueName: "Audit Secret Garden", resPrice: "0", resEnabled: "true" }));
  check("S1 event free", event.is_free === true);
  check("S1 venue-less with custom location", event.venue_id === null && event.venue_name === "Audit Secret Garden");

  const page = await getPage(`/events/${event.slug}`);
  check("S1 page shows custom location", page.text.includes("Audit Secret Garden"));
  check("S1 page shows free entry msg", page.text.includes("Free entry · no ticket required"));
  check("S1 page shows free reserve CTA", page.text.includes("Reserve free table"));
  check("S1 no ticket cards", !page.raw.includes("ticket_id"));

  // user flow: free reservation
  const fd = new FormData();
  fd.append("venue_id", "");
  fd.append("event_id", event.id);
  fd.append("redirect", `/events/${event.slug}`);
  fd.append("phone", "+38344123456");
  fd.append("party_size", "3");
  fd.append("notes", "audit free");
  const res = await adminPost(BOOKING.createReservation, {
    venue_id: "",
    event_id: event.id,
    redirect: `/events/${event.slug}`,
    phone: "+38344123456",
    party_size: "3",
    notes: "audit free",
  }, `/events/${event.slug}`);
  check("S1 free reservation redirects confirmed", (res.location ?? "").includes("reservation=confirmed") || (res.location ?? "").includes("?reservation=confirmed"), res.location ?? "");
  const rows = await db(`reservations?select=id,status,payment_status,payment_method,deposit_cents,party_size,notes,event_id,venue_id&event_id=eq.${event.id}`);
  check("S1 reservation row created", rows.length === 1);
  if (rows[0]) {
    check("S1 status confirmed/waived/none/0", rows[0].status === "confirmed" && rows[0].payment_status === "waived" && rows[0].payment_method === "none" && rows[0].deposit_cents === 0, JSON.stringify(rows[0]));
    check("S1 party size 3 saved", rows[0].party_size === 3);
    check("S1 attached to event, no venue", rows[0].event_id === event.id && rows[0].venue_id === null);
  }
  // duplicate submission -> creates a second reservation (backend has no dedupe)
  await adminPost(BOOKING.createReservation, {
    venue_id: "",
    event_id: event.id,
    redirect: `/events/${event.slug}`,
    phone: "+38344123456",
    party_size: "2",
  }, `/events/${event.slug}`);
  const rows2 = await db(`reservations?select=id&event_id=eq.${event.id}`);
  check("S1 duplicate submit creates duplicate row", rows2.length === 2, `found ${rows2.length}`);
  SUMMARY.push(["S1 free+free+no-venue", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S2: Paid reservation (pay at venue + online optional) ============
log("=== S2 Paid reservation (€7, pay-at-venue allowed) ===");
{
  const { event } = await createEvent(eventFields({ title: "AUDIT S2 PaidRes", venueName: "Audit Rooftop", resPrice: "7", resEnabled: "true", reqOnline: "false", payAtVenue: "true" }));
  check("S2 res price stored 7", event.reservation_price_eur === 7);
  const page = await getPage(`/events/${event.slug}`);
  check("S2 CTA shows €7", page.text.includes("Reserve table · €7"));
  // Modal internals (fee summary / payment options) render client-side on open
  // only; the modal config comes from the same server resolver that set the
  // CTA label, and the backend row below is asserted against the config.

  // pay_at_venue flow
  const res = await adminPost(BOOKING.createReservation, {
    venue_id: "",
    event_id: event.id,
    redirect: `/events/${event.slug}`,
    phone: "+38344123456",
    party_size: "2",
    payment_method: "pay_at_venue",
    notes: "",
  }, `/events/${event.slug}`);
  check("S2 pay-at-venue -> pending flash", (res.location ?? "").includes("reservation=pending"), res.location ?? "");
  const rows = await db(`reservations?select=id,status,payment_status,payment_method,deposit_cents,party_size&event_id=eq.${event.id}`);
  if (rows[0]) {
    check("S2 deposit_cents=700 from server config", rows[0].deposit_cents === 700 && rows[0].payment_method === "pay_at_venue" && rows[0].payment_status === "due_at_venue" && rows[0].status === "pending_payment", JSON.stringify(rows[0]));
  } else {
    check("S2 reservation row created", false);
  }
  SUMMARY.push(["S2 paid-res", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S3: Free event with paid tickets (admin toggles Free->Paid) ============
log("=== S3 Free -> Paid (tiers win over stale Free flag) ===");
{
  // create free event, then edit: switch to paid with two tiers
  const created = await createEvent(eventFields({ title: "AUDIT S3 FreeToPaid", venueName: "Audit Yard", isFree: true }));
  // simulate the real form: it sends tickets_original_ids of existing tiers
  const existing = await db(`tickets?select=id&event_id=eq.${created.event.id}`);
  const editFields = eventFields({
    title: "AUDIT S3 FreeToPaid",
    venueName: "Audit Yard",
    isFree: false,
    tickets: [
      { id: existing[0]?.id, tier_name: "Early Bird", price_cents: 1000, quantity_total: "", description: "first" },
      { id: existing[1]?.id ?? undefined, tier_name: "GA", price_cents: 1500, quantity_total: "", description: null },
    ],
  });
  editFields.id = created.event.id;
  editFields.tickets_original_ids = existing.map((t) => t.id).join(",");
  editFields.is_free = "off";
  await adminPost(ACTIONS.saveEvent, editFields);
  const ev = await db(`events?select=id,is_free,ticket_from_eur&id=eq.${created.event.id}`);
  check("S3 is_free=false after paid tiers", ev[0]?.is_free === false);
  check("S3 ticket_from_eur=cheapest 10", ev[0]?.ticket_from_eur === 10);
  const tiers = await db(`tickets?select=id,tier_name,price_cents,status,quantity_total&event_id=eq.${created.event.id}`);
  check("S3 two tiers created", tiers.length === 2, JSON.stringify(tiers));
  check("S3 tiers priced 10/15", tiers.some((t) => t.price_cents === 1000) && tiers.some((t) => t.price_cents === 1500));

  const page = await getPage(`/events/${created.event.slug}`);
  check("S3 page shows tickets (not free)", page.text.includes("Early Bird") && page.text.includes("From €10") && !page.text.includes("Free entry · no ticket required"));

  // backend order amount must be 1500c for 1x GA
  const ga = tiers.find((t) => t.price_cents === 1500);
  const res = await adminPost(BOOKING.createTicketCheckout, { ticket_id: ga.id, redirect: `/events/${created.event.slug}`, quantity: "1" }, `/events/${created.event.slug}`);
  const orders = await db(`ticket_orders?select=id,amount_cents,quantity,payment_status,status,ticket_id&ticket_id=eq.${ga.id}&user_id=not.is.null&order=created_at.desc&limit=1`);
  check("S3 order amount = 1500c", orders[0]?.amount_cents === 1500, JSON.stringify(orders[0]));
  check("S3 checkout failed gracefully (RaiAccept sandbox auth)", (res.location ?? "").includes("error=payment"), res.location ?? "");
  const tierAfter = await db(`tickets?select=quantity_reserved&id=eq.${ga.id}`);
  check("S3 failed checkout released inventory", tierAfter[0]?.quantity_reserved === 0, JSON.stringify(tierAfter[0]));
  SUMMARY.push(["S3 free->paid tiers", created.event.slug]);
  await deleteEventDeep(created.event.id);
}

// ============ S4/S5/S6: Paid event, multiple tiers, quantities ============
log("=== S4+S5+S6 Paid event, multi tier, quantities ===");
{
  const { event } = await createEvent(eventFields({
    title: "AUDIT S4 MultiTier",
    venueName: "Audit Hall",
    isFree: false,
    tickets: [
      { tier_name: "VIP", price_cents: 2500, quantity_total: "100", description: null },
      { tier_name: "GA", price_cents: 1500, quantity_total: "100", description: "standard" },
      { tier_name: "Early", price_cents: 900, quantity_total: "50", description: null },
    ],
  }));
  const page = await getPage(`/events/${event.slug}`);
  check("S4 all tier cards visible", page.text.includes("VIP") && page.text.includes("GA") && page.text.includes("Early"));
  check("S4 cheapest shown as From €9", page.text.includes("From €9"));
  check("S4 card prices shown", page.text.includes("€25") && page.text.includes("€15") && page.text.includes("€9"));

  const tiers = await db(`tickets?select=id,price_cents,quantity_total&event_id=eq.${event.id}`);
  const ga = tiers.find((t) => t.price_cents === 1500);
  const early = tiers.find((t) => t.price_cents === 900);

  // qty 2 GA -> order amount must equal tier price * qty (backend truth)
  await adminPost(BOOKING.createTicketCheckout, { ticket_id: ga.id, redirect: `/events/${event.slug}`, quantity: "2" }, `/events/${event.slug}`);
  let orders = await db(`ticket_orders?select=amount_cents,quantity,payment_status,status,merchant_order_reference&ticket_id=eq.${ga.id}&order=created_at.desc&limit=1`);
  check("S5 2x GA amount = 3000c", orders[0]?.amount_cents === 3000 && orders[0]?.quantity === 2, JSON.stringify(orders[0]));
  check("S5 merchant ref prefixed", (orders[0]?.merchant_order_reference ?? "").startsWith("neya_ticket_"));
  // RaiAccept sandbox auth fails -> the order is released (inventory restored).
  let t = await db(`tickets?select=quantity_reserved&id=eq.${ga.id}`);
  check("S5 failed checkout releases inventory", t[0]?.quantity_reserved === 0, JSON.stringify(t[0]));

  // qty 4 Early -> amount 3600
  await adminPost(BOOKING.createTicketCheckout, { ticket_id: early.id, redirect: `/events/${event.slug}`, quantity: "4" }, `/events/${event.slug}`);
  orders = await db(`ticket_orders?select=amount_cents,quantity&ticket_id=eq.${early.id}&order=created_at.desc&limit=1`);
  check("S6 4x Early amount = 3600c", orders[0]?.amount_cents === 3600 && orders[0]?.quantity === 4, JSON.stringify(orders[0]));

  // oversubscription: quantity_total 100, ask for 999 in one call (no pending
  // order) -> backend must reject with a clear error, no reservation.
  const ov = await userRpc("reserve_ticket_order", { p_ticket_id: ga.id, p_quantity: 999 });
  check("S6 oversubscription rejected by backend", ov.status === 400, `${ov.status} ${ov.text.slice(0,120)}`);
  t = await db(`tickets?select=quantity_reserved&id=eq.${ga.id}`);
  check("S6 rejected order did not reserve", t[0]?.quantity_reserved === 0, JSON.stringify(t[0]));
  SUMMARY.push(["S4 multi-tier", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S7: Limited capacity (tier qty 3) ============
log("=== S7 Limited capacity (tier qty 3) ===");
{
  const { event } = await createEvent(eventFields({
    title: "AUDIT S7 Capacity",
    venueName: "Audit Box",
    isFree: false,
    tickets: [{ tier_name: "Only", price_cents: 500, quantity_total: "3", description: null }],
  }));
  const tiers = await db(`tickets?select=id,quantity_total&event_id=eq.${event.id}`);
  const tier = tiers[0];
  // One in-flight order per user per ticket (duplicate guard): book qty=3 in ONE
  // call, then the 4th (qty=1) is rejected by the availability gate (not the
  // duplicate guard, since the 1st order is released on checkout failure).
  const r1 = await userRpc("reserve_ticket_order", { p_ticket_id: tier.id, p_quantity: 3 });
  check("S7 qty=3 order succeeds", r1.status === 200, `${r1.status} ${r1.text}`);
  const t = await db(`tickets?select=quantity_sold,quantity_reserved&id=eq.${tier.id}`);
  check("S7 3/3 reserved", t[0]?.quantity_reserved === 3, JSON.stringify(t[0]));
  const r4 = await userRpc("reserve_ticket_order", { p_ticket_id: tier.id, p_quantity: 1 });
  check("S7 over-capacity order rejected by backend", r4.status === 400, `${r4.status} ${r4.text.slice(0, 120)}`);
  const page = await getPage(`/events/${event.slug}`);
  check("S7 page shows sold out state", page.text.includes("Sold out") && page.text.includes("All tickets sold out"));
  check("S7 pay CTA hidden", !page.raw.includes("Preparing checkout"));
  SUMMARY.push(["S7 tier-capacity", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S12: EVENT-level capacity enforcement (reservation party_size) ============
// The 20260827 migration adds event_capacity_state + a capacity gate in
// create_reservation. If unapplied, reservations can EXCEED event capacity.
log("=== S12 Event capacity vs reservation party_size ===");
{
  const { event } = await createEvent(eventFields({
    title: "AUDIT S12 EventCap",
    venueName: "Audit Capsule",
    isFree: true,
    capacity: "2",
    resPrice: "5",
    resEnabled: "true",
  }));
  // party_size 5 vs event capacity 2 -> backend MUST reject with 'capacity'.
  const r = await userRpc("create_reservation", { p_venue_id: null, p_event_id: event.id, p_party_size: 5, p_notes: "", p_phone: "+38344123456", p_payment_method: "pay_at_venue" });
  const enforced = r.status === 400 && r.text.includes("capacity");
  check("S12 over-capacity reservation rejected ('capacity')", enforced, `${r.status} ${r.text.slice(0, 160)}`);
  const rows = await db(`reservations?select=id,event_id,party_size&event_id=eq.${event.id}`);
  check("S12 no reservation row created when over capacity", rows.length === 0, JSON.stringify(rows));
  if (!enforced) {
    log("  >>> FINDING: hosted DB lacks the 20260827 capacity-enforcement migration;");
    log("  >>> create_reservation accepts party_size 5 against capacity 2 (overbooking).");
    // clean up the overbooked reservation if it was created
    if (rows.length) await dbDelete("reservations", `event_id=eq.${event.id}`);
  }
  SUMMARY.push(["S12 event-capacity", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S8: venue-less with custom location + reservations ============
log("=== S8 No Venue + custom location, booked as event-level ===");
{
  const { event } = await createEvent(eventFields({ title: "AUDIT S8 NoVenue", venueName: "Audit Pop-up Plaza", resPrice: "5", resEnabled: "true" }));
  const page = await getPage(`/events/${event.slug}`);
  check("S8 shows pop-up location", page.text.includes("Audit Pop-up Plaza"));
  check("S8 reserve CTA with €5", page.text.includes("Reserve table · €5"));
  const r = await userRpc("create_reservation", { p_venue_id: null, p_event_id: event.id, p_party_size: 2, p_notes: "", p_phone: "+38344123456", p_payment_method: "pay_at_venue" });
  check("S8 venue-less reservation accepted", r.status === 200, `${r.status} ${r.text.slice(0, 160)}`);
  const rows = await db(`reservations?select=deposit_cents,payment_method,payment_status,status,event_id,venue_id&event_id=eq.${event.id}`);
  check("S8 deposit 500, venue_id null", rows[0]?.deposit_cents === 500 && rows[0]?.venue_id === null && rows[0]?.payment_method === "pay_at_venue", JSON.stringify(rows[0]));
  SUMMARY.push(["S8 no-venue", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S9: Event with existing venue; price override + inherit ============
log("=== S9 Venue event: override + inherit ===");
{
  // override: price 15 (venue is 20), tickets GA 10
  const a = await createEvent(eventFields({ title: "AUDIT S9 Override", venueId: VENUE_ID, resPrice: "15", isFree: false, tickets: [{ tier_name: "GA", price_cents: 1000, quantity_total: "50", description: null }] }));
  const page = await getPage(`/events/${a.event.slug}`);
  check("S9 venue name shown", page.text.includes("Audit Matrix Arena"));
  check("S9 reserve CTA €15 (event override)", page.text.includes("Reserve table · €15"));
  const r = await userRpc("create_reservation", { p_venue_id: VENUE_ID, p_event_id: a.event.id, p_party_size: 2, p_notes: "", p_phone: "", p_payment_method: "pay_at_venue" });
  check("S9 reservation accepted", r.status === 200, `${r.status} ${r.text.slice(0, 160)}`);
  let rows = await db(`reservations?select=deposit_cents,payment_status&event_id=eq.${a.event.id}`);
  check("S9 deposit from event override = 1500", rows[0]?.deposit_cents === 1500, JSON.stringify(rows[0]));
  await deleteEventDeep(a.event.id);

  // inherit: empty price + empty tri-state -> NULLs ("Inherit from venue")
  const b = await createEvent(eventFields({ title: "AUDIT S9 Inherit", venueId: VENUE_ID, resPrice: "", resEnabled: "", reqOnline: "", payAtVenue: "", tickets: [{ tier_name: "GA", price_cents: 1200, quantity_total: "", description: null }] }));
  const ev = (await db(`events?select=capacity,reservation_price_eur,requires_online_payment,allows_pay_at_venue,reservations_enabled&id=eq.${b.event.id}`))[0];
  check("S9 inherit stores NULLs", ev.capacity === null && ev.reservation_price_eur === null && ev.requires_online_payment === null && ev.allows_pay_at_venue === null && ev.reservations_enabled === null, JSON.stringify(ev));
  const pb = await getPage(`/events/${b.event.slug}`);
  check("S9 page shows venue capacity 300", /\b300\b/.test(pb.text) && pb.text.includes("Capacity"));
  check("S9 reserve CTA €20 (venue price)", pb.text.includes("Reserve table · €20"));
  await deleteEventDeep(b.event.id);
}

// ============ S10: Reservations disabled ============
log("=== S10 Reservations disabled ===");
{
  const { event } = await createEvent(eventFields({ title: "AUDIT S10 ResClosed", venueName: "Audit Dark Room", resEnabled: "false" }));
  const page = await getPage(`/events/${event.slug}`);
  check("S10 page says reservations closed", page.text.includes("Table reservations are closed"));
  const r = await userRpc("create_reservation", { p_venue_id: null, p_event_id: event.id, p_party_size: 2, p_notes: "", p_phone: "", p_payment_method: "none" });
  check("S10 backend rejects reservations-closed", r.status === 400 && r.text.includes("reservations-closed"), `${r.status} ${r.text.slice(0, 160)}`);
  SUMMARY.push(["S10 res-closed", event.slug]);
  await deleteEventDeep(event.id);
}

// ============ S11: Tickets disabled (free event, no tiers) ============
log("=== S11 Tickets disabled ===");
{
  const { event } = await createEvent(eventFields({ title: "AUDIT S11 NoTickets", venueName: "Audit Basement" }));
  const page = await getPage(`/events/${event.slug}`);
  check("S11 free entry message", page.text.includes("Free entry · no ticket required"));
  check("S11 no ticket CTA", !page.text.includes("Tickets for") && !page.text.includes("Pay €"));
  const meta = await db(`tickets?select=id&event_id=eq.${event.id}`);
  check("S11 no ticket rows", meta.length === 0);
  SUMMARY.push(["S11 no-tickets", event.slug]);
  await deleteEventDeep(event.id);
}

log(`\n===== AUDIT RESULT: ${pass} passed, ${fail} failed =====`);
if (failures.length) {
  log("FAILURES:");
  for (const f of failures) log("  -", f);
  process.exit(1);
}