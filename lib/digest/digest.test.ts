/**
 * Digest logic tests — run with:
 *   node --experimental-strip-types --test supabase/functions/send-weekly-digest/digest.test.ts
 * (Excluded from the app's tsconfig — see tsconfig.json exclude.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getUpcomingWeekendWindow,
  isThursdayDigestWindow,
  dayOfWeekInTz,
  isEligibleEmail,
  isPublicEvent,
  eventBaseScore,
  rankEvents,
  rankVenues,
  personalize,
  computeCta,
  normalizeGenre,
  type DigestEventRow,
  type DigestVenueRowWithMeta,
  type EngagementCounts,
  type DigestUser,
} from "./logic.ts";
import { buildDigestEmail } from "./email.ts";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "./token.ts";

/* ------------------------------------------------------------------ */
/* Timezone / DST                                                      */
/* ------------------------------------------------------------------ */

test("weekend window: Thursday before the CET→CEST transition (Mar 2026)", () => {
  // Thu 2026-03-26 16:00 CET (UTC+1)
  const now = new Date("2026-03-26T15:00:00Z");
  assert.equal(dayOfWeekInTz(now.toISOString()), 4, "should be Thursday local");
  const w = getUpcomingWeekendWindow(now);
  assert.ok(w, "window expected");
  assert.equal(w.weekStart, "2026-03-27");
  // Friday 00:00 CET == Thursday 23:00 UTC
  assert.equal(w.fridayStartUtc, "2026-03-26T23:00:00.000Z");
  // Sunday 23:59:59.999 CEST (UTC+2, DST already active) == 21:59:59.999 UTC
  assert.equal(w.sundayEndUtc, "2026-03-29T21:59:59.999Z");
});

test("weekend window: Thursday before the CEST→CET transition (Oct 2026)", () => {
  // Thu 2026-10-22 16:00 CEST (UTC+2)
  const now = new Date("2026-10-22T14:00:00Z");
  assert.equal(dayOfWeekInTz(now.toISOString()), 4, "should be Thursday local");
  const w = getUpcomingWeekendWindow(now);
  assert.ok(w, "window expected");
  assert.equal(w.weekStart, "2026-10-23");
  // Friday 00:00 CEST == Thursday 22:00 UTC
  assert.equal(w.fridayStartUtc, "2026-10-22T22:00:00.000Z");
  // Sunday 23:59:59.999 CET (UTC+1, DST already ended) == 22:59:59.999 UTC
  assert.equal(w.sundayEndUtc, "2026-10-25T22:59:59.999Z");
});

test("weekend window: non-Thursday returns null", () => {
  const wed = new Date("2026-03-25T15:00:00Z");
  const fri = new Date("2026-03-27T15:00:00Z");
  assert.equal(getUpcomingWeekendWindow(wed), null);
  assert.equal(getUpcomingWeekendWindow(fri), null);
});

test("isThursdayDigestWindow respects local wall clock across DST", () => {
  // 16:00 local in winter (UTC+1) and summer (UTC+2)
  assert.equal(isThursdayDigestWindow(new Date("2026-03-26T15:00:00Z")), true);
  assert.equal(isThursdayDigestWindow(new Date("2026-10-22T14:00:00Z")), true);
  // 13:00 local Thursday — midday is inside the tolerant window
  assert.equal(isThursdayDigestWindow(new Date("2026-03-26T12:00:00Z")), true);
  // 10:00 local Thursday — outside the window
  assert.equal(isThursdayDigestWindow(new Date("2026-03-26T09:00:00Z")), false);
  // Friday evening — wrong day
  assert.equal(isThursdayDigestWindow(new Date("2026-03-27T15:00:00Z")), false);
});

/* ------------------------------------------------------------------ */
/* Event visibility + ranking                                          */
/* ------------------------------------------------------------------ */

function event(partial: Partial<DigestEventRow>): DigestEventRow {
  return {
    id: "evt",
    slug: "evt",
    title: "Event",
    starts_at: "2026-03-28T20:00:00Z",
    ...partial,
  };
}

const emptyCounts: EngagementCounts = { ticketOrders: {}, reservations: {}, guestlistRequests: {}, saves: {}, checkins: {} };

test("isPublicEvent drops events at unapproved venues, keeps venue-TBA events", () => {
  assert.equal(isPublicEvent(event({ venues: { id: "v", slug: "v", name: "V", approved: false } })), false);
  assert.equal(isPublicEvent(event({ venues: { id: "v", slug: "v", name: "V", approved: true } })), true);
  assert.equal(isPublicEvent(event({ venues: null })), true);
});

test("eventBaseScore uses only existing signals; deterministic ranking", () => {
  const counts: EngagementCounts = {
    ticketOrders: { a: 2 },
    reservations: { a: 1 },
    guestlistRequests: { b: 1 },
    saves: {},
    checkins: { b: 3 },
  };
  const a = event({ id: "a", slug: "a", title: "A", starts_at: "2026-03-28T20:00:00Z" });
  const b = event({ id: "b", slug: "b", title: "B", starts_at: "2026-03-28T21:00:00Z" });
  const ranked = rankEvents([a, b], counts);
  assert.equal(ranked[0]?.event.id, "a");
  // Same input, same output — fully deterministic.
  const again = rankEvents([a, b], counts);
  assert.deepEqual(ranked.map((r) => r.event.id), again.map((r) => r.event.id));
  assert.ok(eventBaseScore(a, counts) > eventBaseScore(b, counts));
});

/* ------------------------------------------------------------------ */
/* Personalization                                                     */
/* ------------------------------------------------------------------ */

function user(prefs: Partial<DigestUser>): DigestUser {
  return { id: "u", email: "u@example.com", musicGenres: [], interests: [], ...prefs };
}

test("personalize boosts a matching genre without burying popularity", () => {
  const techno = event({ id: "t", slug: "t", title: "Techno night", genre: "techno", starts_at: "2026-03-28T22:00:00Z" });
  const hipHop = event({ id: "h", slug: "h", title: "Hip hop night", genre: "hip_hop", starts_at: "2026-03-28T20:00:00Z" });

  // Equal popularity → earlier start wins without prefs; a genre match flips it.
  const tied: EngagementCounts = { ...emptyCounts };
  assert.equal(personalize(rankEvents([techno, hipHop], tied), user({}))[0]?.event.id, "h");
  assert.equal(
    personalize(rankEvents([techno, hipHop], tied), user({ musicGenres: ["techno"] }))[0]?.event.id,
    "t",
  );

  // A big popularity gap stays on top even for a matching user (boost is bounded).
  const popular: EngagementCounts = { ...emptyCounts, ticketOrders: { h: 8 } }; // base h = 32
  const prefUser = personalize(rankEvents([techno, hipHop], popular), user({ musicGenres: ["techno"] }));
  assert.equal(prefUser[0]?.event.id, "h");
});

test("normalizeGenre maps legacy labels", () => {
  assert.equal(normalizeGenre("Hip-Hop"), "hip_hop");
  assert.equal(normalizeGenre("afro"), "afro_house");
  assert.equal(normalizeGenre("R&B"), "r_and_b");
  assert.equal(normalizeGenre("r_b"), "r_and_b");
  assert.equal(normalizeGenre("Techno"), "techno");
  assert.equal(normalizeGenre(null), "other");
});

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

test("computeCta picks the right contextual CTA", () => {
  const base = { siteUrl: "https://neya.live" };
  const withTickets = event({});
  assert.deepEqual(computeCta(withTickets, { hasAvailableTickets: true, hasGuestlist: false }, base.siteUrl), {
    kind: "buy",
    label: "Buy ticket",
    url: "https://neya.live/events/evt#tickets",
  });
  const withExternal = event({ ticket_url: "https://ticketa.com/x" });
  assert.equal(computeCta(withExternal, { hasAvailableTickets: false, hasGuestlist: false }, base.siteUrl).label, "Buy tickets");
  const reserve = event({ venues: { id: "v", slug: "v", name: "V", reservations_enabled: true } });
  assert.equal(computeCta(reserve, { hasAvailableTickets: false, hasGuestlist: false }, base.siteUrl).label, "Reserve a table");
  const gl = event({});
  assert.equal(computeCta(gl, { hasAvailableTickets: false, hasGuestlist: true }, base.siteUrl).label, "Join guestlist");
  const plain = event({});
  assert.equal(computeCta(plain, { hasAvailableTickets: false, hasGuestlist: false }, base.siteUrl).label, "View event");
});

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

test("isEligibleEmail requires a valid, confirmed email", () => {
  assert.equal(isEligibleEmail("a@b.co", "2026-01-01T00:00:00Z"), true);
  assert.equal(isEligibleEmail("a@b.co", null), false);
  assert.equal(isEligibleEmail(null, "2026-01-01T00:00:00Z"), false);
  assert.equal(isEligibleEmail("not-an-email", "2026-01-01T00:00:00Z"), false);
});

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

test("unsubscribe tokens: roundtrip, tamper, expiry, wrong secret", async () => {
  const secret = "test-secret-123";
  const profileId = "11111111-1111-4111-8111-111111111111";
  const token = await createUnsubscribeToken(profileId, secret);
  assert.equal(await verifyUnsubscribeToken(token, secret), profileId);
  assert.equal(await verifyUnsubscribeToken(token + "x", secret), null);
  assert.equal(await verifyUnsubscribeToken(token.slice(0, -2) + "ab", secret), null);
  assert.equal(await verifyUnsubscribeToken(token, "other-secret"), null);
  // Expired (negative TTL)
  const expired = await createUnsubscribeToken(profileId, secret, -1);
  assert.equal(await verifyUnsubscribeToken(expired, secret), null);
  assert.equal(await verifyUnsubscribeToken("garbage", secret), null);
});

/* ------------------------------------------------------------------ */
/* Email template                                                      */
/* ------------------------------------------------------------------ */

test("email template renders with escaped content and unsubscribe link", async () => {
  const evt = event({
    id: "e1",
    slug: "e1",
    title: 'Party <script>alert("x")</script>',
    genre: "techno",
    starts_at: "2026-03-28T22:00:00Z",
    ticket_from_eur: 15,
  });
  const siteUrl = "https://neya.live";
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=tok`;
  const html = buildDigestEmail({
    siteUrl,
    subject: "This weekend in Prishtina — 1 event worth checking out",
    preview: "Events, venues and plans for your weekend in Prishtina.",
    events: [{ event: evt, venue: null, baseScore: 1, score: 1 }],
    ctas: { e1: { label: "Buy ticket", url: `${siteUrl}/events/e1#tickets` } },
    eventImages: { e1: null },
    trendingVenue: null,
    unsubscribeUrl,
  });
  assert.ok(html.includes("&lt;script&gt;"), "event title must be escaped");
  assert.ok(!html.includes("<script>"), "no raw script tags");
  assert.ok(html.includes("Buy ticket"));
  assert.ok(html.includes("This weekend in Prishtina"));
  assert.ok(html.includes(unsubscribeUrl));
  assert.ok(html.includes("€15"));
  assert.ok(html.includes("max-width:600px"));
  assert.ok(html.includes("Events, venues and plans"), "preview text present");
});

test("venue selection is deterministic and prefers trending flags + engagement", () => {
  const v = (partial: Partial<DigestVenueRowWithMeta>): DigestVenueRowWithMeta => ({
    id: "v",
    slug: "v",
    name: "Venue",
    approved: true,
    checkins7d: 0,
    reservations7d: 0,
    ...partial,
  });
  const quiet = v({ id: "quiet", slug: "quiet", name: "Quiet" });
  const busy = v({ id: "busy", slug: "busy", name: "Busy", checkins7d: 10 });
  const flagged = v({ id: "flag", slug: "flag", name: "Flagged", is_trending: true });
  // 10 weekly check-ins (20 pts) > trending flag (6 + atmosphere ≈ 7.6) > quiet.
  const ranked = rankVenues([quiet, busy, flagged]);
  assert.deepEqual(ranked.map((x) => x.id), ["busy", "flag", "quiet"]);
  const again = rankVenues([quiet, busy, flagged]);
  assert.deepEqual(ranked.map((x) => x.id), again.map((x) => x.id));
});
