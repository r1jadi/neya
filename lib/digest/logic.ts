/**
 * Pure digest logic — no Deno/Next dependencies so it runs identically in the
 * Edge Function (Deno) and in tests (Node). Timezone handling mirrors the
 * app's own helpers in lib/event-dates.ts.
 */

/** Prishtina — the app uses Europe/Belgrade (CET/CEST), which has the same rules as Europe/Pristina. */
export const CITY_TZ = "Europe/Belgrade";

export interface WallClock {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
}

export function wallClockParts(utcMs: number, tz = CITY_TZ): WallClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const v = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { y: v("year"), m: v("month"), d: v("day"), h: v("hour"), min: v("minute") };
}

/** Local wall-clock time → UTC ISO, DST-aware (port of lib/event-dates datetimeLocalToUtcIso). */
export function localToUtcIso(y: number, mo: number, d: number, h: number, min: number, sec = 0, tz = CITY_TZ): string | null {
  const desired = Date.UTC(y, mo - 1, d, h, min, sec);
  let ts = desired;
  for (let i = 0; i < 4; i++) {
    const w = wallClockParts(ts, tz);
    const actual = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, sec);
    ts += desired - actual;
  }
  return new Date(ts).toISOString();
}

export function addCalendarDaysInTz(y: number, m: number, d: number, delta: number, tz = CITY_TZ): WallClock {
  const anchor = localToUtcIso(y, m, d, 12, 0, 0, tz);
  const ms = new Date(anchor ?? 0).getTime() + delta * 86400000;
  return wallClockParts(ms, tz);
}

/** 0 = Sunday … 6 = Saturday (Prishtina wall clock). */
export function dayOfWeekInTz(iso: string, tz = CITY_TZ): number {
  const name = new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
  const map: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  return map[name] ?? 0;
}

/**
 * Is `now` within the intended weekly send window — Thursday in Prishtina,
 * from midday to midnight local? Wide enough to tolerate Vercel Hobby cron's
 * ±59-minute timing drift while still gating the daily invocation to
 * exactly one day per week.
 */
export function isThursdayDigestWindow(now: Date, tz = CITY_TZ): boolean {
  if (dayOfWeekInTz(now.toISOString(), tz) !== 4) return false;
  const w = wallClockParts(now.getTime(), tz);
  return w.h >= 12 && w.h < 24;
}

/**
 * Upcoming weekend window in Prishtina local time:
 * Friday 00:00 → Sunday 23:59:59.999.
 * Returns null unless today is Thursday.
 */
export function getUpcomingWeekendWindow(now: Date, tz = CITY_TZ): { fridayStartUtc: string; sundayEndUtc: string; weekStart: string } | null {
  const w = wallClockParts(now.getTime(), tz);
  if (dayOfWeekInTz(now.toISOString(), tz) !== 4) return null;
  const fri = addCalendarDaysInTz(w.y, w.m, w.d, 1, tz);
  const sun = addCalendarDaysInTz(fri.y, fri.m, fri.d, 2, tz);
  const pad = (n: number) => String(n).padStart(2, "0");

  const fridayStart = localToUtcIso(fri.y, fri.m, fri.d, 0, 0, 0, tz);
  const sundayEndBase = localToUtcIso(sun.y, sun.m, sun.d, 23, 59, 59, tz);
  if (!fridayStart || !sundayEndBase) return null;
  // Push to the last millisecond of the local Sunday.
  const sundayEndUtc = new Date(new Date(sundayEndBase).getTime() + 999).toISOString();

  return {
    fridayStartUtc: fridayStart,
    sundayEndUtc,
    weekStart: `${fri.y}-${pad(fri.m)}-${pad(fri.d)}`,
  };
}

/* ------------------------------------------------------------------ */
/* Genre normalization (mirrors lib/mappers/supabase.ts)               */
/* ------------------------------------------------------------------ */

const LEGACY_GENRES: Record<string, string> = {
  afro: "afro_house",
  "hip-hop": "hip_hop",
  "r&b": "r_and_b",
  live: "live_music",
  mixed: "other",
};

export function normalizeGenre(g: string | null | undefined): string {
  const raw = (g ?? "other").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (raw === "r_b") return "r_and_b";
  return LEGACY_GENRES[g?.toLowerCase() ?? ""] ?? raw;
}

/* ------------------------------------------------------------------ */
/* Data shapes (subset of the real PostgREST rows)                     */
/* ------------------------------------------------------------------ */

export interface DigestVenueRow {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  approved?: boolean | null;
  image_url?: string | null;
  reservations_enabled?: boolean | null;
  is_trending?: boolean | null;
  crowd_count?: number | null;
  atmosphere_score?: number | string | null;
}

export interface DigestEventRow {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  genre?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  crowd_count?: number | null;
  atmosphere_rating?: number | string | null;
  is_featured?: boolean | null;
  reservation_spots_left?: number | null;
  ticket_from_eur?: number | string | null;
  venues?: DigestVenueRow | DigestVenueRow[] | null;
}

export interface EngagementCounts {
  ticketOrders: Record<string, number>;
  reservations: Record<string, number>;
  guestlistRequests: Record<string, number>;
  saves: Record<string, number>;
  checkins: Record<string, number>;
}

export interface RankedEvent {
  event: DigestEventRow;
  venue: DigestVenueRow | null;
  baseScore: number;
  score: number;
}

export interface DigestUser {
  id: string;
  email: string;
  musicGenres: string[];
  interests: string[];
}

/** Events whose venue is unapproved are not public — drop them. */
export function isPublicEvent(e: DigestEventRow): boolean {
  if (e.venues == null) return true; // venue TBA events are still listed
  const v = Array.isArray(e.venues) ? e.venues[0] : e.venues;
  if (!v) return true;
  return v.approved !== false;
}

export function venueOf(e: DigestEventRow): DigestVenueRow | null {
  if (e.venues == null) return null;
  const v = Array.isArray(e.venues) ? e.venues[0] : e.venues;
  return v ?? null;
}

function num(n: number | string | null | undefined, fallback: number): number {
  if (typeof n === "number" && !Number.isNaN(n)) return n;
  if (typeof n === "string") {
    const p = parseFloat(n);
    if (!Number.isNaN(p)) return p;
  }
  return fallback;
}

/**
 * Deterministic base engagement score. Uses only signals that exist in the
 * schema; missing signals simply contribute zero.
 */
export function eventBaseScore(
  e: DigestEventRow,
  c: EngagementCounts,
): number {
  const tickets = c.ticketOrders[e.id] ?? 0;
  const reservations = c.reservations[e.id] ?? 0;
  const guestlist = c.guestlistRequests[e.id] ?? 0;
  const saves = c.saves[e.id] ?? 0;
  const checkins = c.checkins[e.id] ?? 0;
  const crowd = Math.min(500, num(e.crowd_count, 0));
  const atmosphere = num(e.atmosphere_rating, 8);

  return (
    tickets * 4 +
    reservations * 3 +
    guestlist * 2 +
    saves * 2 +
    checkins * 1 +
    crowd * 0.1 +
    (atmosphere - 8) * 0.5 +
    (e.is_featured ? 1 : 0)
  );
}

/** Sort by score desc, then soonest first, then title — fully deterministic. */
export function rankEvents(events: DigestEventRow[], c: EngagementCounts): RankedEvent[] {
  return events
    .map((e) => {
      const baseScore = eventBaseScore(e, c);
      return { event: e, venue: venueOf(e), baseScore, score: baseScore };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = new Date(a.event.starts_at).getTime();
      const tb = new Date(b.event.starts_at).getTime();
      if (ta !== tb) return ta - tb;
      return a.event.title.localeCompare(b.event.title);
    });
}

/**
 * Personalization: base popularity + bounded preference boost.
 * A genre match adds +3, a venue-category interest match +1.5 — enough to
 * surface a preference but never to bury genuinely popular nights.
 */
export function personalize(ranked: RankedEvent[], user: DigestUser): RankedEvent[] {
  const genres = new Set(user.musicGenres.map((g) => normalizeGenre(g)));
  const interests = new Set(user.interests.map((x) => x.toLowerCase()));
  const scored = ranked.map((r) => {
    let boost = 0;
    if (genres.size > 0 && genres.has(normalizeGenre(r.event.genre))) boost += 3;
    if (interests.size > 0 && r.venue?.category && interests.has(r.venue.category.toLowerCase())) boost += 1.5;
    return { ...r, score: r.baseScore + boost };
  });
  // Stable by construction: sort is deterministic because rankEvents already
  // produced a total order and boosts only reorder within equal scores.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ta = new Date(a.event.starts_at).getTime();
    const tb = new Date(b.event.starts_at).getTime();
    if (ta !== tb) return ta - tb;
    return a.event.title.localeCompare(b.event.title);
  });
  return scored;
}

/* ------------------------------------------------------------------ */
/* Venue selection                                                     */
/* ------------------------------------------------------------------ */

export interface DigestVenueRowWithMeta extends DigestVenueRow {
  checkins7d: number;
  reservations7d: number;
}

export function venueTrendingScore(v: DigestVenueRowWithMeta): number {
  return (
    (v.is_trending ? 6 : 0) +
    Math.min(50, v.checkins7d) * 2 +
    Math.min(50, v.reservations7d) * 1.5 +
    Math.min(500, num(v.crowd_count, 0)) * 0.1 +
    num(v.atmosphere_score, 8) * 0.2 +
    (v.image_url ? 0.5 : 0)
  );
}

export function rankVenues(venues: DigestVenueRowWithMeta[]): DigestVenueRowWithMeta[] {
  return [...venues].sort((a, b) => {
    const sa = venueTrendingScore(a);
    const sb = venueTrendingScore(b);
    if (sb !== sa) return sb - sa;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

/* ------------------------------------------------------------------ */
/* CTA + eligibility                                                   */
/* ------------------------------------------------------------------ */

export type CtaKind = "buy" | "reserve" | "guestlist" | "view";

export interface EventCapabilities {
  hasAvailableTickets: boolean;
  hasGuestlist: boolean;
}

export function computeCta(
  e: DigestEventRow,
  caps: EventCapabilities,
  siteUrl: string,
): { kind: CtaKind; label: string; url: string } {
  const page = `${siteUrl}/events/${e.slug}`;
  if (caps.hasAvailableTickets) {
    return { kind: "buy", label: "Buy ticket", url: `${page}#tickets` };
  }
  if (e.ticket_url) {
    return { kind: "buy", label: "Buy tickets", url: e.ticket_url };
  }
  const v = venueOf(e);
  if (v?.reservations_enabled) {
    return { kind: "reserve", label: "Reserve a table", url: page };
  }
  if (caps.hasGuestlist) {
    return { kind: "guestlist", label: "Join guestlist", url: page };
  }
  return { kind: "view", label: "View event", url: page };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Users must have a real, confirmed email address. */
export function isEligibleEmail(email: string | null | undefined, emailConfirmedAt: string | null | undefined): boolean {
  if (!email || !emailConfirmedAt) return false;
  if (!EMAIL_RE.test(email)) return false;
  return email.length <= 320;
}

/** The send window is the only place timezone/DST matters for selection; helpers below are pure formatting. */
export function formatEventDayTime(startsAt: string, tz = CITY_TZ): string {
  const d = new Date(startsAt);
  const day = d.toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time}`;
}
