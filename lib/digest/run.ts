/**
 * Weekly "This Weekend" digest runner — invoked by Vercel Cron.
 *
 * Flow: Vercel Cron (daily, CRON_SECRET-protected) → GET /api/cron/weekly-digest
 * → runWeeklyDigest → Supabase (service role) → Resend.
 *
 * Safety:
 *  - The daily cron hits this endpoint every day; the Thursday window check
 *    plus the DB week claim make exactly one run per week possible.
 *  - The database (weekly_digest_sends, unique week_start) is the source of
 *    truth for duplicate prevention. A week that was already sent or skipped
 *    is never re-sent. Failed or stale (>30 min) claims are retryable.
 *  - Individual recipient failures never abort the run; a hard deadline
 *    (function time budget) stops sending and records partial results.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { createUnsubscribeToken } from "@/lib/digest/token";
import {
  CITY_TZ,
  computeCta,
  dayOfWeekInTz,
  getUpcomingWeekendWindow,
  isEligibleEmail,
  isPublicEvent,
  isThursdayDigestWindow,
  personalize,
  rankEvents,
  rankVenues,
  venueOf,
  type DigestEventRow,
  type DigestUser,
  type DigestVenueRowWithMeta,
  type EngagementCounts,
} from "@/lib/digest/logic";
import { buildDigestEmail } from "@/lib/digest/email";

/** Vercel Hobby function limit is 60s — keep a margin for the response. */
const TIME_BUDGET_MS = 50_000;
/** Parallel sends — bounded so we never hammer Resend. */
const CONCURRENCY = 8;
/** A stale in-progress claim is retryable after this long. */
const STALE_CLAIM_MS = 30 * 60_000;

type AdminClient = ReturnType<typeof createAdminClient>;

export interface DigestReport {
  week: string;
  skipped?: string;
  recipients: number;
  successCount: number;
  failureCount: number;
  events: number;
  trendingVenue: string | null;
  status: string;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

async function loadEvents(
  admin: AdminClient,
  fridayStartUtc: string,
  sundayEndUtc: string,
): Promise<DigestEventRow[]> {
  const { data, error } = await admin
    .from("events")
    .select(
      "id, slug, title, description, venue_name, starts_at, ends_at, genre, image_url, ticket_url, crowd_count, atmosphere_rating, is_featured, reservation_spots_left, ticket_from_eur, venues(id, slug, name, category, approved, image_url, reservations_enabled)",
    )
    .eq("is_listed_public", true)
    .gte("starts_at", fridayStartUtc)
    .lte("starts_at", sundayEndUtc);
  if (error) throw new Error(`events query failed: ${error.message}`);
  return (data ?? []).filter(isPublicEvent) as DigestEventRow[];
}

async function loadEngagement(admin: AdminClient, eventIds: string[]): Promise<EngagementCounts> {
  const counts: EngagementCounts = {
    ticketOrders: {},
    reservations: {},
    guestlistRequests: {},
    saves: {},
    checkins: {},
  };
  if (!eventIds.length) return counts;

  const add = (map: Record<string, number>, id: string | null | undefined) => {
    if (!id) return;
    map[id] = (map[id] ?? 0) + 1;
  };

  const [{ data: orders }, { data: reservations }, { data: gl }, { data: saves }, { data: checkins }] =
    await Promise.all([
      admin
        .from("ticket_orders")
        .select("tickets!inner(event_id)")
        .eq("payment_status", "paid")
        .in("tickets.event_id", eventIds),
      admin
        .from("reservations")
        .select("event_id")
        .in("status", ["pending", "pending_payment", "confirmed"])
        .in("event_id", eventIds),
      admin
        .from("guestlist_requests")
        .select("event_id")
        .in("status", ["pending", "approved", "checked_in"])
        .in("event_id", eventIds),
      admin.from("saved_events").select("event_id").in("event_id", eventIds),
      admin.from("checkins").select("event_id").in("event_id", eventIds),
    ]);

  for (const row of orders ?? []) {
    const t = row.tickets as { event_id?: string | null } | { event_id?: string | null }[] | null;
    add(counts.ticketOrders, Array.isArray(t) ? t[0]?.event_id : t?.event_id);
  }
  for (const row of reservations ?? []) add(counts.reservations, (row as { event_id?: string | null }).event_id);
  for (const row of gl ?? []) add(counts.guestlistRequests, (row as { event_id?: string | null }).event_id);
  for (const row of saves ?? []) add(counts.saves, (row as { event_id?: string | null }).event_id);
  for (const row of checkins ?? []) add(counts.checkins, (row as { event_id?: string | null }).event_id);

  return counts;
}

async function loadCapabilities(admin: AdminClient, eventIds: string[]) {
  const caps: Record<string, { hasAvailableTickets: boolean; hasGuestlist: boolean }> = {};
  for (const id of eventIds) caps[id] = { hasAvailableTickets: false, hasGuestlist: false };
  if (!eventIds.length) return caps;

  const [{ data: tickets }, { data: guestlists }] = await Promise.all([
    admin.from("tickets").select("event_id, status").in("event_id", eventIds),
    admin.from("guestlists").select("event_id").in("event_id", eventIds),
  ]);
  for (const t of tickets ?? []) {
    if ((t as { status?: string }).status === "available") {
      caps[(t as { event_id: string }).event_id].hasAvailableTickets = true;
    }
  }
  for (const g of guestlists ?? []) caps[(g as { event_id: string }).event_id].hasGuestlist = true;
  return caps;
}

async function loadTrendingVenues(admin: AdminClient, sinceIso: string): Promise<DigestVenueRowWithMeta[]> {
  const { data, error } = await admin
    .from("venues")
    .select("id, slug, name, category, approved, image_url, is_trending, crowd_count, atmosphere_score, reservations_enabled")
    .eq("approved", true);
  if (error) throw new Error(`venues query failed: ${error.message}`);

  const venueIds = (data ?? []).map((v) => (v as { id: string }).id);
  const [{ data: checkins }, { data: reservations }] = await Promise.all([
    venueIds.length
      ? admin.from("checkins").select("venue_id").gte("created_at", sinceIso).in("venue_id", venueIds)
      : Promise.resolve({ data: [] as unknown[] }),
    venueIds.length
      ? admin
          .from("reservations")
          .select("venue_id")
          .gte("created_at", sinceIso)
          .in("status", ["pending", "pending_payment", "confirmed"])
          .in("venue_id", venueIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const checkinCounts: Record<string, number> = {};
  for (const c of checkins ?? []) {
    const id = (c as { venue_id?: string | null }).venue_id;
    if (id) checkinCounts[id] = (checkinCounts[id] ?? 0) + 1;
  }
  const reservationCounts: Record<string, number> = {};
  for (const r of reservations ?? []) {
    const id = (r as { venue_id?: string | null }).venue_id;
    if (id) reservationCounts[id] = (reservationCounts[id] ?? 0) + 1;
  }

  return (data ?? []).map((v) => {
    const row = v as DigestVenueRowWithMeta;
    row.checkins7d = checkinCounts[row.id ?? ""] ?? 0;
    row.reservations7d = reservationCounts[row.id ?? ""] ?? 0;
    return row;
  });
}

async function loadRecipients(admin: AdminClient): Promise<DigestUser[]> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, music_genres, interests, digest_opt_out, account_active");
  if (error) throw new Error(`profiles query failed: ${error.message}`);

  const { data: authUsers, error: authError } = await admin.from("auth.users").select("id, email, email_confirmed_at");
  if (authError) throw new Error(`auth.users query failed: ${authError.message}`);

  const emailByUserId = new Map<string, { email?: string | null; emailConfirmedAt?: string | null }>();
  for (const u of authUsers ?? []) {
    emailByUserId.set((u as { id: string }).id, u as { email?: string | null; emailConfirmedAt?: string | null });
  }

  const users: DigestUser[] = [];
  for (const p of profiles ?? []) {
    const row = p as {
      id: string;
      music_genres?: string[] | null;
      interests?: string[] | null;
      digest_opt_out?: boolean | null;
      account_active?: boolean | null;
    };
    if (row.digest_opt_out) continue;
    if (row.account_active === false) continue;
    const auth = emailByUserId.get(row.id);
    if (!auth) continue;
    if (!isEligibleEmail(auth.email, auth.emailConfirmedAt)) continue;
    users.push({
      id: row.id,
      email: auth.email as string,
      musicGenres: row.music_genres ?? [],
      interests: row.interests ?? [],
    });
  }
  // Deterministic order — stable batches, reproducible runs.
  users.sort((a, b) => a.id.localeCompare(b.id));
  return users;
}

/* ------------------------------------------------------------------ */
/* Week claim (idempotency, DB as source of truth)                     */
/* ------------------------------------------------------------------ */

async function claimWeek(
  admin: AdminClient,
  weekStart: string,
): Promise<{ id: string } | "already-done" | "in-progress"> {
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("weekly_digest_sends")
    .upsert(
      { week_start: weekStart, status: "sending", started_at: nowIso },
      { onConflict: "week_start", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`claim failed: ${error.message}`);
  if (data && data.length > 0) return { id: (data[0] as { id: string }).id };

  // The week already exists — decide whether it's finished or retryable.
  const { data: existing } = await admin
    .from("weekly_digest_sends")
    .select("id, status, started_at")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (!existing) throw new Error(`claim conflict but no row for ${weekStart}`);

  const row = existing as { id: string; status: string; started_at: string };
  if (row.status === "sent" || row.status === "skipped") return "already-done";

  const stale = Date.now() - new Date(row.started_at).getTime() > STALE_CLAIM_MS;
  if (row.status === "failed" || (row.status === "sending" && stale)) {
    const { error: resetErr } = await admin
      .from("weekly_digest_sends")
      .update({
        status: "sending",
        started_at: nowIso,
        completed_at: null,
        recipient_count: 0,
        success_count: 0,
        failure_count: 0,
        events_count: 0,
        error: null,
      })
      .eq("id", row.id);
    if (resetErr) throw new Error(`claim reset failed: ${resetErr.message}`);
    return { id: row.id };
  }
  return "in-progress";
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export async function runWeeklyDigest(): Promise<DigestReport> {
  const now = new Date();

  if (!isThursdayDigestWindow(now, CITY_TZ)) {
    return {
      week: "",
      skipped: `not Thursday in Prishtina (local day ${dayOfWeekInTz(now.toISOString(), CITY_TZ)})`,
      recipients: 0,
      successCount: 0,
      failureCount: 0,
      events: 0,
      trendingVenue: null,
      status: "skipped",
    };
  }

  const window = getUpcomingWeekendWindow(now, CITY_TZ);
  if (!window) {
    return { week: "", skipped: "not Thursday", recipients: 0, successCount: 0, failureCount: 0, events: 0, trendingVenue: null, status: "skipped" };
  }

  const admin = createAdminClient();
  const claim = await claimWeek(admin, window.weekStart);
  if (claim === "already-done") {
    return { week: window.weekStart, skipped: "week already processed", recipients: 0, successCount: 0, failureCount: 0, events: 0, trendingVenue: null, status: "skipped" };
  }
  if (claim === "in-progress") {
    return { week: window.weekStart, skipped: "another run in progress", recipients: 0, successCount: 0, failureCount: 0, events: 0, trendingVenue: null, status: "skipped" };
  }

  const finish = async (patch: Record<string, unknown>) => {
    await admin
      .from("weekly_digest_sends")
      .update({ ...patch, completed_at: new Date().toISOString() })
      .eq("id", claim.id);
  };

  try {
    const events = await loadEvents(admin, window.fridayStartUtc, window.sundayEndUtc);
    if (events.length === 0) {
      await finish({ status: "skipped", recipient_count: 0, events_count: 0, error: "no events this weekend" });
      return { week: window.weekStart, skipped: "no eligible events this weekend", recipients: 0, successCount: 0, failureCount: 0, events: 0, trendingVenue: null, status: "skipped" };
    }

    const eventIds = events.map((e) => e.id);
    const [engagement, caps, venues, users] = await Promise.all([
      loadEngagement(admin, eventIds),
      loadCapabilities(admin, eventIds),
      loadTrendingVenues(admin, new Date(Date.now() - 7 * 86400000).toISOString()),
      loadRecipients(admin),
    ]);

    if (users.length === 0) {
      await finish({ status: "skipped", recipient_count: 0, events_count: events.length, error: "no eligible recipients" });
      return { week: window.weekStart, skipped: "no eligible recipients", recipients: 0, successCount: 0, failureCount: 0, events: events.length, trendingVenue: null, status: "skipped" };
    }

    const signingSecret = process.env.DIGEST_SIGNING_SECRET;
    if (!signingSecret) {
      await finish({ status: "failed", recipient_count: 0, events_count: events.length, error: "DIGEST_SIGNING_SECRET missing" });
      throw new Error("DIGEST_SIGNING_SECRET is not configured — refusing to send emails without an unsubscribe path");
    }

    const ranked = rankEvents(events, engagement);
    const baseTop = ranked.slice(0, 8); // bound personalization work
    const trending = rankVenues(venues)[0] ?? null;
    const siteUrl = getPublicSiteUrl();
    const ttlDays = Number.parseInt(process.env.DIGEST_TOKEN_TTL_DAYS ?? "90", 10) || 90;

    const eventImages: Record<string, string | null> = {};
    for (const e of events) eventImages[e.id] = e.image_url ?? venueOf(e)?.image_url ?? null;

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];
    const deadline = Date.now() + TIME_BUDGET_MS;

    const sendOne = async (user: DigestUser) => {
      try {
        const top = personalize(baseTop, user).slice(0, 3);
        const ctas: Record<string, { label: string; url: string }> = {};
        for (const r of top) {
          ctas[r.event.id] = computeCta(r.event, caps[r.event.id] ?? { hasAvailableTickets: false, hasGuestlist: false }, siteUrl);
        }

        const subject =
          top.length === 1
            ? "This weekend in Prishtina — 1 event worth checking out"
            : `This weekend in Prishtina — ${top.length} events worth checking out`;
        const preview = "Events, venues and plans for your weekend in Prishtina.";
        const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${await createUnsubscribeToken(user.id, signingSecret, ttlDays)}`;

        const html = buildDigestEmail({
          siteUrl,
          subject,
          preview,
          events: top,
          ctas,
          eventImages,
          trendingVenue: trending,
          unsubscribeUrl,
        });

        const sent = await sendTransactionalEmail(user.email, subject, html);
        if (!sent.ok) throw new Error(sent.error);
        successCount += 1;
      } catch (err) {
        failureCount += 1;
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${user.id}: ${message.slice(0, 160)}`);
      }
    };

    // Bounded-concurrency pool; stops when the function time budget runs low.
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, users.length) }, async () => {
      while (cursor < users.length && Date.now() < deadline) {
        const user = users[cursor];
        cursor += 1;
        await sendOne(user);
      }
    });
    await Promise.all(workers);

    const timedOut = cursor < users.length;
    const status = successCount > 0 || failureCount > 0 ? "sent" : "failed";
    await finish({
      status,
      events_count: Math.min(3, events.length),
      recipient_count: users.length,
      success_count: successCount,
      failure_count: failureCount,
      error: timedOut
        ? `time budget reached after ${successCount + failureCount}/${users.length} recipients`
        : failures.length
          ? failures.slice(0, 20).join("; ").slice(0, 500)
          : null,
    });

    return {
      week: window.weekStart,
      recipients: users.length,
      successCount,
      failureCount,
      events: Math.min(3, events.length),
      trendingVenue: trending?.name ?? null,
      status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[digest] run failed", message);
    await finish({ status: "failed", recipient_count: 0, error: message.slice(0, 500) });
    throw err;
  }
}
