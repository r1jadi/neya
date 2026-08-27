// NEYA Event form validation audit.
// Drives saveEvent directly (bypassing the browser, exactly like a crafted
// FormData POST) and inspects whether invalid data reaches the DB. The
// frontend EventForm is client-only; a determined/erroneous client can always
// omit its checks, so the backend is the real gate. This harness treats the
// server action as the public API surface.
import { ACTIONS, adminPost, db, dbDelete, deleteEventDeep, localInput, log } from "./.tmp-events-harness-live.mjs";

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; log(`  PASS ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); log(`  FAIL ${name} ${detail}`); }
}

async function save(fields) {
  return adminPost(ACTIONS.saveEvent, fields);
}
async function findEvent(title) {
  return db(`events?select=id,slug,title,starts_at,ends_at,is_free,ticket_from_eur,reservation_price_eur,reservations_enabled,requires_online_payment,allows_pay_at_venue,capacity,venue_id,venue_name,description,submission_status,is_listed_public&title=eq.${encodeURIComponent(title)}`);
}
async function findTickets(eventId) {
  return db(`tickets?select=id,tier_name,price_cents,quantity_total,description,status&event_id=eq.${eventId}`);
}
async function clean(title) {
  const rows = await findEvent(title).catch(() => []);
  for (const r of rows) await deleteEventDeep(r.id).catch(() => null);
}

// Baseline valid field set mirroring the real EventForm.
function base({ title = "AUDIT V", venueId = "", venueName = "Audit Loc", startsAt, endsAt = "", isFree = "on", ticketFromEur = "", resPrice = "", resEnabled = "true", reqOnline = "false", payAtVenue = "true", capacity = "", ticketsJson = "[]", listed = true } = {}) {
  const f = {
    title, venue_id: venueId, venue_name: venueName,
    starts_at: startsAt ?? localInput(40), ends_at: endsAt,
    genre: "techno", category: "nightlife", city_slug: "prishtina",
    tags: "audit", description: "baseline", image_url: "",
    performers: "[]", artist_ids: "", capacity,
    ticket_from_eur: ticketFromEur, reservation_price_eur: resPrice,
    reservations_enabled: resEnabled, requires_online_payment: reqOnline,
    allows_pay_at_venue: payAtVenue, is_featured: "off", is_hidden_premium: "off",
    tickets_json: ticketsJson, tickets_original_ids: "",
  };
  if (listed) f.is_listed_public = ["on", "off"];
  else f.is_listed_public = ["off", "off"];
  f.is_free = isFree;
  return f;
}
function tiersJson(ts) { return JSON.stringify(ts); }

// ============ V1: empty title ============
log("=== V1 empty title ===");
{
  const t = "AUDIT V1 EmptyTitle";
  await clean(t);
  const f = base({ title: "   " });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V1 empty title rejected (redirect to error=fields)", (res.location ?? "").includes("error=fields"), res.location ?? "");
  check("V1 no row created", rows.length === 0, `${rows.length} rows`);
}

// ============ V2: missing starts_at ============
log("=== V2 missing starts_at ===");
{
  const t = "AUDIT V2 NoStart";
  await clean(t);
  const f = base({ title: t, startsAt: "" });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V2 empty starts_at rejected", (res.location ?? "").includes("error=fields"), res.location ?? "");
  check("V2 no row created", rows.length === 0);
}

// ============ V3: malformed starts_at ============
log("=== V3 malformed starts_at ===");
{
  const t = "AUDIT V3 BadDate";
  await clean(t);
  const f = base({ title: t, startsAt: "not-a-date" });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V3 malformed starts_at rejected", (res.location ?? "").includes("error=fields"), res.location ?? "");
  check("V3 no row created", rows.length === 0);
}

// ============ V4: ends_at before starts_at ============
log("=== V4 ends_at before starts_at ===");
{
  const t = "AUDIT V4 EndBeforeStart";
  await clean(t);
  // starts +40d @20:00, ends +40d @10:00 (ends BEFORE starts)
  const f = base({ title: t, startsAt: localInput(40, 20), endsAt: localInput(40, 10) });
  const res = await save(f);
  const rows = await findEvent(t);
  const ok = (res.location ?? "").includes("error=end-before-start");
  check("V4 ends-before-start rejected", ok, res.location ?? "");
  if (!ok) {
    const e = rows[0];
    check("V4 (bug) end<start but stored anyway", false, JSON.stringify(e));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V4 no row created", rows.length === 0);
  }
}

// ============ V5: ends_at malformed ============
log("=== V5 ends_at malformed (non-empty garbage) ===");
{
  const t = "AUDIT V5 BadEnd";
  await clean(t);
  const f = base({ title: t, startsAt: localInput(40), endsAt: "garbage" });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V5 malformed ends_at rejected", (res.location ?? "").includes("error=fields"), res.location ?? "");
  check("V5 no row created", rows.length === 0);
}

// ============ V6: no venue + empty custom location ============
log("=== V6 no-venue + empty venue_name ===");
{
  const t = "AUDIT V6 NoVenueNoLoc";
  await clean(t);
  const f = base({ title: t, venueId: "", venueName: "" });
  const res = await save(f);
  const rows = await findEvent(t);
  // Backend now requires a custom location for venue-less events.
  const rejected = (res.location ?? "").includes("error=missing-venue");
  check("V6 no-venue-no-location rejected (missing-venue)", rejected, res.location ?? "");
  check("V6 no row created", rows.length === 0);
}

// ============ V7: negative reservation price ============
log("=== V7 negative reservation price ===");
{
  const t = "AUDIT V7 NegResPrice";
  await clean(t);
  const f = base({ title: t, resPrice: "-5" });
  const res = await save(f);
  const rows = await findEvent(t);
  // Backend now rejects negative reservation prices (out of range).
  check("V7 negative res price rejected", (res.location ?? "").includes("error=reservation-price"), res.location ?? "");
  check("V7 no row created", rows.length === 0);
}

// ============ V8: negative capacity ============
log("=== V8 negative capacity ===");
{
  const t = "AUDIT V8 NegCap";
  await clean(t);
  const f = base({ title: t, capacity: "-10" });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    check("V8 negative capacity stored as null (not -10)", e.capacity === null, JSON.stringify(e));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V8 negative capacity rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V9: zero capacity ============
log("=== V9 zero capacity ===");
{
  const t = "AUDIT V9 ZeroCap";
  await clean(t);
  const f = base({ title: t, capacity: "0" });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    check("V9 zero capacity stored as null", e.capacity === null, JSON.stringify(e));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V9 zero capacity rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V10: negative ticket price ============
log("=== V10 negative ticket price ===");
{
  const t = "AUDIT V10 NegTicket";
  await clean(t);
  const tj = tiersJson([{ tier_name: "Bad", price_cents: -500, quantity_total: "10", description: null }]);
  const f = base({ title: t, isFree: "off", ticketsJson: tj });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    const tk = await findTickets(e.id);
    check("V10 negative-price tier dropped (not stored)", tk.length === 0, JSON.stringify(tk));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V10 negative ticket price rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V11: ticket with no name ============
log("=== V11 ticket missing name ===");
{
  const t = "AUDIT V11 NoName";
  await clean(t);
  const tj = tiersJson([{ tier_name: "  ", price_cents: 1000, quantity_total: "10", description: null }]);
  const f = base({ title: t, isFree: "off", ticketsJson: tj });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    const tk = await findTickets(e.id);
    check("V11 nameless tier dropped", tk.length === 0, JSON.stringify(tk));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V11 nameless tier rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V12: negative ticket quantity ============
log("=== V12 negative ticket quantity ===");
{
  const t = "AUDIT V12 NegQty";
  await clean(t);
  const tj = tiersJson([{ tier_name: "GA", price_cents: 1000, quantity_total: "-5", description: null }]);
  const f = base({ title: t, isFree: "off", ticketsJson: tj });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    const tk = await findTickets(e.id);
    check("V12 negative qty clamped to 0 (not -5)", tk[0]?.quantity_total === 0, JSON.stringify(tk[0]));
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V12 negative qty rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V13: duplicate tier names ============
log("=== V13 duplicate tier names ===");
{
  const t = "AUDIT V13 DupTier";
  await clean(t);
  const tj = tiersJson([
    { tier_name: "GA", price_cents: 1000, quantity_total: "10", description: null },
    { tier_name: "GA", price_cents: 1500, quantity_total: "10", description: null },
  ]);
  const f = base({ title: t, isFree: "off", ticketsJson: tj });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V13 duplicate tier names rejected (duplicate-tier)", (res.location ?? "").includes("error=duplicate-tier"), res.location ?? "");
  check("V13 no row created", rows.length === 0);
}


// ============ V14: extremely large values ============
log("=== V14 extremely large values (split) ===");
{
  // V14a: huge reservation price -> rejected entirely
  const ta = "AUDIT V14a HugeRes";
  await clean(ta);
  let res = await save(base({ title: ta, resPrice: "9999999" }));
  let rows = await findEvent(ta);
  check("V14a huge reservation price rejected", (res.location ?? "").includes("error=reservation-price"), res.location ?? "");
  check("V14a no row created", rows.length === 0);

  // V14b: huge ticket_from_eur -> capped to null (not stored)
  const tb = "AUDIT V14b HugeFrom";
  await clean(tb);
  res = await save(base({ title: tb, ticketFromEur: "9999999" }));
  rows = await findEvent(tb);
  const eb = rows[0];
  if (eb) {
    check("V14b huge ticket_from_eur stored as null", eb.ticket_from_eur === null, JSON.stringify(eb));
    await deleteEventDeep(eb.id).catch(() => null);
  } else {
    check("V14b huge ticket_from_eur rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }

  // V14c: huge capacity -> capped to null
  const tc = "AUDIT V14c HugeCap";
  await clean(tc);
  res = await save(base({ title: tc, capacity: "9999999" }));
  rows = await findEvent(tc);
  const ec = rows[0];
  if (ec) {
    check("V14c huge capacity stored as null", ec.capacity === null, JSON.stringify(ec));
    await deleteEventDeep(ec.id).catch(() => null);
  } else {
    check("V14c huge capacity rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }

  // V14d: huge ticket price per tier -> dropped (>1M cents cap)
  const td = "AUDIT V14d HugeTier";
  await clean(td);
  const tj = tiersJson([{ tier_name: "VIP", price_cents: 100000000, quantity_total: "10", description: null }]);
  res = await save(base({ title: td, isFree: "off", ticketsJson: tj }));
  rows = await findEvent(td);
  const ed = rows[0];
  if (ed) {
    const tk = await findTickets(ed.id);
    check("V14d huge ticket price (1e8) dropped (>1M cap)", tk.length === 0, JSON.stringify(tk));
    await deleteEventDeep(ed.id).catch(() => null);
  } else {
    check("V14d huge tier rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

// ============ V15: valid baseline saves correctly ============
log("=== V15 valid baseline saves ===");
{
  const t = "AUDIT V15 Valid";
  await clean(t);
  const f = base({ title: t, startsAt: localInput(50) });
  const res = await save(f);
  const rows = await findEvent(t);
  check("V15 valid event accepted", (res.location ?? "").includes("ok=1") && rows.length === 1, `${res.location} | ${rows.length}`);
  const e = rows[0];
  if (e) {
    check("V15 title stored", e.title === t);
    check("V15 starts_at stored (UTC ISO)", typeof e.starts_at === "string" && /T\d{2}:\d{2}:\d{2}/.test(e.starts_at));
    check("V15 is_free=true", e.is_free === true);
    check("V15 venue-less location stored", e.venue_name === "Audit Loc" && e.venue_id === null);
    check("V15 published", e.is_listed_public === true && e.submission_status === "published");
    await deleteEventDeep(e.id).catch(() => null);
  }
}

// ============ V16: edit existing event into invalid state (ends<start) ============
log("=== V16 edit -> ends_before_start ===");
{
  const t = "AUDIT V16 EditBad";
  await clean(t);
  // create valid
  const c = base({ title: t, startsAt: localInput(60, 20) });
  await save(c);
  let rows = await findEvent(t);
  const id = rows[0]?.id;
  check("V16 valid event created for edit", Boolean(id));
  // edit into invalid: ends before starts
  const f = base({ title: t, startsAt: localInput(60, 20), endsAt: localInput(60, 10) });
  f.id = id;
  const res = await save(f);
  check("V16 edit ends-before-start rejected", (res.location ?? "").includes("error=end-before-start"), res.location ?? "");
  // confirm the original row is UNCHANGED (no partial update)
  rows = await findEvent(t);
  const e = rows[0];
  check("V16 original ends_at unchanged after rejected edit", e.ends_at === null, JSON.stringify(e?.ends_at));
  if (id) await deleteEventDeep(id).catch(() => null);
}

// ============ V17: reservations closed but reservation price set ============
log("=== V17 reservations_closed + res_price (incomplete config) ===");
{
  const t = "AUDIT V17 ResClosedPrice";
  await clean(t);
  const f = base({ title: t, resEnabled: "false", resPrice: "15" });
  const res = await save(f);
  const rows = await findEvent(t);
  const e = rows[0];
  if (e) {
    check("V17 reservations_enabled=false stored", e.reservations_enabled === false);
    check("V17 reservation_price still stored (15) despite closed", e.reservation_price_eur === 15, JSON.stringify(e));
    log("  >>> NOTE: closed reservations keep a price; not corrupt, but inconsistent UI intent.");
    await deleteEventDeep(e.id).catch(() => null);
  } else {
    check("V17 reservations-closed+price rejected", (res.location ?? "").includes("error"), res.location ?? "");
  }
}

log(`\n===== VALIDATION AUDIT: ${pass} passed, ${fail} failed =====`);
if (failures.length) {
  log("FAILURES:");
  for (const f of failures) log("  -", f);
  process.exit(1);
}
