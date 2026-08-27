"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { datetimeLocalToUtcIso } from "@/lib/event-dates";
import { slugify } from "@/lib/slug";
import type { EventPerformer } from "@/types";
import { isVenueCategory, MUSIC_GENRES, PLACES_TYPES } from "@/types";
import { EVENT_CATEGORIES } from "@/lib/discovery";
import { isUuid } from "@/lib/utils";

function parseJsonArray(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseTriState(raw: FormDataEntryValue | null): boolean | null {
  const v = String(raw ?? "").trim();
  if (v === "true" || v === "on") return true;
  if (v === "false" || v === "off") return false;
  return null;
}

/** Reservation/table deposit price in EUR. Returns null for invalid or out-of-range values. */
function clampPriceEur(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000) return null;
  return Math.round(parsed * 100) / 100;
}

function parseSocialLinks(raw: string | null): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function parseTicketTiers(raw: string | null): Array<{
  id?: string;
  tier_name: string;
  price_cents: number;
  quantity_total: number | null;
  description: string | null;
}> {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((item): Array<{ id?: string; tier_name: string; price_cents: number; quantity_total: number | null; description: string | null }> => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const tier_name = typeof row.tier_name === "string" ? row.tier_name.trim().slice(0, 80) : "";
        if (!tier_name) return [];
        const price = Number(row.price_cents);
        if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return [];
        const qty = row.quantity_total;
        const quantity_total =
          qty === null || qty === undefined || qty === ""
            ? null
            : Math.max(0, Math.round(Number(qty) || 0));
        const id =
          typeof row.id === "string" && row.id.trim() ? row.id.trim().slice(0, 64) : undefined;
        const description =
          typeof row.description === "string" && row.description.trim()
            ? row.description.trim().slice(0, 1000)
            : null;
        return [{ id, tier_name, price_cents: Math.round(price), quantity_total, description }];
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

function parsePerformers(raw: string | null): EventPerformer[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim().slice(0, 160) : "";
      if (!name) return [];
      const social = row.social_links;
      const social_links = social && typeof social === "object" && !Array.isArray(social)
        ? Object.fromEntries(Object.entries(social).filter(([, value]) => typeof value === "string" && value.trim()).map(([key, value]) => [key.slice(0, 40), (value as string).trim().slice(0, 2000)]))
        : undefined;
      return [{ name, image_url: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim().slice(0, 2000) : undefined, genre: typeof row.genre === "string" && row.genre.trim() ? row.genre.trim().slice(0, 80) : undefined, social_links }];
    }).slice(0, 30);
  } catch {
    return [];
  }
}

function adminRedirect(params: string) {
  // The timestamp makes every save redirect unique so the admin dashboard can
  // tell a new save from the previous one and close stale open forms.
  redirect(`/admin?${params}&t=${Date.now()}`);
}

/**
 * Keeps the event's entry pricing in sync after ticket rows change outside
 * the event form (Tickets tab): a paid tier marks the event paid, and the
 * listing "from" price follows the cheapest tier. Mirrors saveEvent.
 */
async function syncEventPricingFromTiers(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
) {
  const { data: rows } = await admin.from("tickets").select("price_cents").eq("event_id", eventId);
  const prices = (rows ?? []).map((row) => Number(row.price_cents)).filter((n) => Number.isFinite(n));
  if (!prices.length) return;
  const cheapestCents = Math.min(...prices);
  const patch: { is_free: boolean; ticket_from_eur: number } = {
    is_free: prices.every((value) => value <= 0),
    ticket_from_eur: Math.round(cheapestCents * 100) / 100,
  };
  await admin.from("events").update(patch).eq("id", eventId);
}

export async function saveVenue(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) adminRedirect("tab=venues&error=fields");

  const admin = createAdminClient();
  const payload = {
    name,
    city_slug: String(formData.get("city_slug") ?? "prishtina").slice(0, 64),
    category: (() => { const value = String(formData.get("category") ?? "nightclub").slice(0, 32); return isVenueCategory(value) ? value : "other"; })(),
    description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
    address: String(formData.get("address") ?? "").trim().slice(0, 240) || null,
    lat: formData.get("lat") ? Number(formData.get("lat")) : null,
    lng: formData.get("lng") ? Number(formData.get("lng")) : null,
    image_url: String(formData.get("image_url") ?? "").trim().slice(0, 2000) || null,
    gallery_urls: parseJsonArray(String(formData.get("gallery_urls") ?? "")),
    music_genres: parseJsonArray(String(formData.get("music_genres") ?? "")),
    day_parts: parseJsonArray(String(formData.get("day_parts") ?? "")).filter((part) =>
      ["morning", "daytime", "evening", "late_night"].includes(part),
    ),
    places_types: formData
      .getAll("places_types")
      .map(String)
      .filter((type) => PLACES_TYPES.some((t) => t.id === type)),
    social_links: parseSocialLinks(String(formData.get("social_links") ?? "")),
    website_url: String(formData.get("website_url") ?? "").trim().slice(0, 2000) || null,
    contact_email: String(formData.get("contact_email") ?? "").trim().slice(0, 320) || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim().slice(0, 40) || null,
    capacity: formData.get("capacity") ? Math.max(0, Number(formData.get("capacity")) || 0) : null,
    reservations_enabled: formData.get("reservations_enabled") === "on",
    reservation_price_eur: Math.max(0, Number(formData.get("reservation_price_eur") ?? 0) || 0),
    requires_online_payment: formData.get("requires_online_payment") === "on",
    allows_pay_at_venue: formData.get("allows_pay_at_venue") === "on",
    vip_enabled: formData.get("vip_enabled") === "on",
    approved: formData.get("approved") === "on",
    rejected: formData.get("rejected") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_trending: formData.get("is_trending") === "on",
    price_level: Math.min(4, Math.max(1, Number(formData.get("price_level") ?? 2) || 2)),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin.from("venues").update(payload).eq("id", id);
    if (error) adminRedirect("tab=venues&error=update");
  } else {
    const slug = slugify(name);
    let { error } = await admin.from("venues").insert({ ...payload, slug, approved: payload.approved });
    if (error) {
      // Pre-migration fallback: the places_types column may not exist yet, and
      // PostgREST rejects unknown columns even with an empty array.
      const legacy = { ...payload } as Record<string, unknown>;
      delete legacy.places_types;
      const retry = await admin.from("venues").insert({ ...legacy, slug, approved: payload.approved });
      error = retry.error;
    }
    if (error) adminRedirect("tab=venues&error=insert");
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
  adminRedirect("tab=venues&ok=1");
}

export async function deleteVenue(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=venues&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("venues").delete().eq("id", id);
  if (error) adminRedirect("tab=venues&error=delete");

  revalidatePath("/");
  revalidatePath("/admin");
  adminRedirect("tab=venues&ok=1");
}

export async function approveVenue(formData: FormData) {
  await requireAdminUser();
  const venueId = String(formData.get("venue_id") ?? formData.get("id") ?? "");
  if (!venueId) adminRedirect("tab=venues&error=missing");

  const admin = createAdminClient();
  const { error } = await admin
    .from("venues")
    .update({ approved: true, rejected: false, updated_at: new Date().toISOString() })
    .eq("id", venueId);
  if (error) adminRedirect("tab=venues&error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
  adminRedirect("tab=venues&approved=1");
}

export async function rejectVenue(formData: FormData) {
  await requireAdminUser();
  const venueId = String(formData.get("venue_id") ?? formData.get("id") ?? "");
  if (!venueId) adminRedirect("tab=venues&error=missing");

  const admin = createAdminClient();
  const { error } = await admin
    .from("venues")
    .update({ approved: false, rejected: true, updated_at: new Date().toISOString() })
    .eq("id", venueId);
  if (error) adminRedirect("tab=venues&error=update");

  revalidatePath("/admin");
  adminRedirect("tab=venues&ok=1");
}

export async function saveEvent(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();
  const startsAt = datetimeLocalToUtcIso(startsAtLocal);
  if (!title || !startsAt) adminRedirect("tab=events&error=fields");

  const endsLocal = String(formData.get("ends_at") ?? "").trim();
  const endsAt = endsLocal ? datetimeLocalToUtcIso(endsLocal) : null;
  if (endsLocal && !endsAt) adminRedirect("tab=events&error=fields");
  // An end before the start is nonsensical (a 2am finish reads as earlier
  // the same calendar day). Reject it here rather than letting a corrupt
  // range reach the DB and confuse "happening now" / "past" computations.
  if (endsAt && startsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    adminRedirect("tab=events&error=end-before-start");
  }
  const genreRaw = String(formData.get("genre") ?? "other").slice(0, 32);
  const genre = MUSIC_GENRES.some((option) => option.id === genreRaw) ? genreRaw : "other";

  const admin = createAdminClient();
  const performers = parsePerformers(String(formData.get("performers") ?? ""));
  const hasVenue = Boolean(venueId);
  // Custom one-time location for venue-less events (no NEYA Venue record is
  // created). It is stored as-is and cleared whenever a real venue is selected.
  // A venue-less event with no custom location would show users no place at
  // all, so require one here — the form field is optional only because the
  // "No venue" choice is what toggles its visibility.
  const venueName = String(formData.get("venue_name") ?? "").trim().slice(0, 160) || null;
  if (!hasVenue && !venueName) adminRedirect("tab=events&error=missing-venue");

  // Booking settings are NOT affected by venue selection: the admin's explicit
  // tri-state choices are stored verbatim. NULL is only kept when the admin
  // picked "Inherit from venue" on a venue-linked event — venue-less events
  // have nothing to inherit, so a null explicit value falls back to concrete
  // defaults (reservations open, €0 free, online optional, pay-at-venue
  // allowed) as the single source of truth.
  const reservationPriceRaw = String(formData.get("reservation_price_eur") ?? "").trim();
  // "Inherit from venue" only applies to venue-linked events with an empty
  // price; otherwise parse and range-check. Reject absurd values (a 1500 EUR
  // table deposit is almost certainly a typo) rather than silently clamping.
  const reservationPriceEur =
    hasVenue && reservationPriceRaw === ""
      ? null
      : clampPriceEur(reservationPriceRaw);
  if (!(hasVenue && reservationPriceRaw === "") && reservationPriceRaw !== "" && reservationPriceEur === null) {
    adminRedirect("tab=events&error=reservation-price");
  }
  const reservationsEnabledRaw = parseTriState(formData.get("reservations_enabled"));
  const requiresOnlinePaymentRaw = parseTriState(formData.get("requires_online_payment"));
  const allowsPayAtVenueRaw = parseTriState(formData.get("allows_pay_at_venue"));
  const reservationsEnabled = hasVenue ? reservationsEnabledRaw : (reservationsEnabledRaw ?? true);
  const requiresOnlinePayment = hasVenue ? requiresOnlinePaymentRaw : (requiresOnlinePaymentRaw ?? false);
  const allowsPayAtVenue = hasVenue ? allowsPayAtVenueRaw : (allowsPayAtVenueRaw ?? true);

  const submittedTiers = parseTicketTiers(String(formData.get("tickets_json") ?? ""));
  // Duplicate tier names confuse users (two "GA" cards with different
  // prices). Reject case-insensitively after trimming.
  const seenTierNames = new Set<string>();
  for (const tier of submittedTiers) {
    const key = tier.tier_name.trim().toLowerCase();
    if (seenTierNames.has(key)) adminRedirect("tab=events&error=duplicate-tier");
    seenTierNames.add(key);
  }
  // Ticket tiers are the single source of truth for entry pricing. A paid
  // tier always wins over a stale "Free" flag (legacy rows where the admin
  // checked Free but configured paid tickets): the user would otherwise see
  // "Free" on cards and "Pay €X" on the event page for the same night.
  const hasPaidTier = submittedTiers.some((tier) => tier.price_cents > 0);
  const isFree = hasPaidTier ? false : formData.get("is_free") === "on";

  const payload = {
    title,
    venue_id: venueId || null,
    venue_name: hasVenue ? null : venueName,
    description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    genre,
    city_slug: String(formData.get("city_slug") ?? "prishtina").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64) || "prishtina",
    category: (() => { const value = String(formData.get("category") ?? "nightlife"); return EVENT_CATEGORIES.some((item) => item.id === value) ? value : "other"; })(),
    tags: parseJsonArray(String(formData.get("tags") ?? "")).slice(0, 20).map((tag) => tag.slice(0, 48)),
    is_free: isFree,
    image_url: String(formData.get("image_url") ?? "").trim().slice(0, 2000) || null,
    performers,
    // Keep the legacy field populated for legacy DJ lineup reads.
    dj_lineup: performers.map((performer) => performer.name),
    // Empty capacity = inherit the venue's capacity (NULL stored). A sane
    // upper bound (1 000 000) rejects obvious typos without affecting real
    // events; non-positive / non-finite values fall back to NULL (inherit).
    capacity: (() => {
      const raw = String(formData.get("capacity") ?? "").trim();
      if (raw === "") return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000 ? Math.round(parsed) : null;
    })(),
    ticket_from_eur: (() => {
      const raw = formData.get("ticket_from_eur");
      if (!raw) return null;
      const parsed = Number(raw);
      // Mirror the per-tier cap (1 000 000 cents = 10 000 EUR) so the listing
      // price can never exceed what an actual ticket may cost.
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10_000 ? Math.round(parsed * 100) / 100 : null;
    })(),
    reservation_price_eur: reservationPriceEur,
    reservations_enabled: reservationsEnabled,
    requires_online_payment: requiresOnlinePayment,
    allows_pay_at_venue: allowsPayAtVenue,
    is_featured: formData.get("is_featured") === "on",
    is_listed_public: formData.get("is_listed_public") !== "off",
    // Unlisting through the form maps to DRAFT (not approved): the moderation
    // dropdown treats approved as auto-listed, so a no-op re-save of
    // "Approved" would silently re-publish an event the admin unlisted.
    submission_status: formData.get("is_listed_public") !== "off" ? "published" : "draft",
    is_hidden_premium: formData.get("is_hidden_premium") === "on",
    updated_at: new Date().toISOString(),
  };

  let eventId = id;
  if (id) {
    const { error } = await admin.from("events").update(payload).eq("id", id);
    if (error) adminRedirect("tab=events&error=update");
  } else {
    const slug = slugify(title);
    const { data: inserted, error } = await admin
      .from("events")
      .insert({ ...payload, slug })
      .select("id")
      .single();
    if (error) adminRedirect("tab=events&error=insert");
    eventId = inserted?.id ?? "";
  }

  // Sync the artist lineup (many-to-many). Empty selection clears the lineup.
  if (eventId && isUuid(eventId)) {
    const artistIds = String(formData.get("artist_ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => isUuid(value))
      .slice(0, 20);
    const { error: clearError } = await admin.from("event_artists").delete().eq("event_id", eventId);
    if (!clearError && artistIds.length) {
      await admin
        .from("event_artists")
        .insert(artistIds.map((artist_id) => ({ event_id: eventId, artist_id })));
    }
  }

  // Inline ticket tiers — the event form is the source of truth for the tiers
  // it saves. Existing tiers are updated in place, new ones inserted, and only
  // tiers that existed when the form opened are deleted when removed (tiers
  // created elsewhere are never touched). Tier status (sold out / closed) is
  // preserved on existing rows.
  if (eventId && isUuid(eventId)) {
    const originalTicketIds = String(formData.get("tickets_original_ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => isUuid(value));
    const submittedTicketIds = new Set(
      submittedTiers.map((tier) => tier.id).filter((value): value is string => Boolean(value)),
    );
    if (originalTicketIds.length) {
      const removedIds = originalTicketIds.filter((value) => !submittedTicketIds.has(value));
      if (removedIds.length) {
        await admin.from("tickets").delete().in("id", removedIds);
      }
    }
    for (const tier of submittedTiers) {
      if (tier.id && originalTicketIds.includes(tier.id)) {
        await admin
          .from("tickets")
          .update({
            event_id: eventId,
            tier_name: tier.tier_name,
            price_cents: tier.price_cents,
            currency: "EUR",
            quantity_total: tier.quantity_total,
            description: tier.description,
          })
          .eq("id", tier.id);
      } else if (!tier.id) {
        await admin.from("tickets").insert({
          event_id: eventId,
          tier_name: tier.tier_name,
          price_cents: tier.price_cents,
          currency: "EUR",
          quantity_total: tier.quantity_total,
          description: tier.description,
          status: "available",
        });
      }
    }
    // The listing "from" price follows the cheapest tier when tiers exist
    // (single source of truth); otherwise the manual value is kept.
    if (submittedTiers.length) {
      const cheapestCents = Math.min(...submittedTiers.map((tier) => tier.price_cents));
      await admin
        .from("events")
        .update({ ticket_from_eur: Math.round(cheapestCents) / 100 })
        .eq("id", eventId);
    }
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/my-night");
  revalidatePath("/venues");
  adminRedirect("tab=events&ok=1");
}

export async function deleteEvent(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=events&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) adminRedirect("tab=events&error=delete");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  revalidatePath("/admin");
  adminRedirect("tab=events&ok=1");
}

export async function saveTicket(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const tierName = String(formData.get("tier_name") ?? "").trim().slice(0, 80);
  const priceCents = Number(formData.get("price_cents") ?? 0);
  if (!eventId || !tierName || priceCents < 0) adminRedirect("tab=tickets&error=fields");

  const admin = createAdminClient();
  const payload = {
    event_id: eventId,
    tier_name: tierName,
    price_cents: Math.round(priceCents),
    currency: String(formData.get("currency") ?? "EUR").slice(0, 8),
    quantity_total: formData.get("quantity_total") ? Number(formData.get("quantity_total")) : null,
    description: String(formData.get("description") ?? "").trim().slice(0, 1000) || null,
    status: ["available", "sold_out", "closed"].includes(String(formData.get("status") ?? "available"))
      ? String(formData.get("status"))
      : "available",
    sales_start: String(formData.get("sales_start") ?? "").trim() || null,
    sales_end: String(formData.get("sales_end") ?? "").trim() || null,
  };

  if (id) {
    const { error } = await admin.from("tickets").update(payload).eq("id", id);
    if (error) adminRedirect("tab=tickets&error=update");
  } else {
    const { error } = await admin.from("tickets").insert(payload);
    if (error) adminRedirect("tab=tickets&error=insert");
  }

  // Keep the event's entry pricing consistent with its tiers.
  await syncEventPricingFromTiers(admin, eventId);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  adminRedirect("tab=tickets&ok=1");
}

export async function deleteTicket(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=tickets&error=missing");

  const admin = createAdminClient();
  // Capture which event the ticket belonged to, then remove it and keep the
  // event's entry pricing consistent with its remaining tiers.
  const { data: row } = await admin.from("tickets").select("event_id").eq("id", id).maybeSingle();
  const { error } = await admin.from("tickets").delete().eq("id", id);
  if (error) adminRedirect("tab=tickets&error=delete");

  if (row?.event_id) {
    const { data: remaining } = await admin.from("tickets").select("price_cents").eq("event_id", row.event_id);
    const prices = (remaining ?? []).map((r) => Number(r.price_cents)).filter((n) => Number.isFinite(n));
    // No tiers left: revert to a free event (clear the listing price too).
    // Otherwise keep the cheapest-tier listing price and paid flag.
    if (!prices.length) {
      await admin.from("events").update({ is_free: true, ticket_from_eur: null }).eq("id", row.event_id);
    } else {
      await syncEventPricingFromTiers(admin, row.event_id);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  adminRedirect("tab=tickets&ok=1");
}

export async function saveGuestlist(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!eventId || !name) adminRedirect("tab=guestlists&error=fields");

  const admin = createAdminClient();
  const payload = {
    event_id: eventId,
    name,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
    is_vip: formData.get("is_vip") === "on",
    is_open: formData.get("is_open") === "on",
    requires_manual_approval: formData.get("requires_manual_approval") === "on",
  };

  if (id) {
    const { error } = await admin.from("guestlists").update(payload).eq("id", id);
    if (error) adminRedirect("tab=guestlists&error=update");
  } else {
    const { error } = await admin.from("guestlists").insert(payload);
    if (error) adminRedirect("tab=guestlists&error=insert");
  }

  adminRedirect("tab=guestlists&ok=1");
}

export async function deleteGuestlist(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=guestlists&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("guestlists").delete().eq("id", id);
  if (error) adminRedirect("tab=guestlists&error=delete");

  adminRedirect("tab=guestlists&ok=1");
}

export async function updateReservationStatus(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["pending", "pending_payment", "confirmed", "rejected", "cancelled"].includes(status)) {
    adminRedirect("tab=reservations&error=fields");
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "confirmed") {
    const { data: row } = await admin.from("reservations").select("payment_status").eq("id", id).maybeSingle();
    if (row?.payment_status === "due_at_venue") {
      patch.payment_status = "due_at_venue";
    } else if (row?.payment_status === "pending") {
      patch.payment_status = "paid";
    }
  }

  const { error } = await admin.from("reservations").update(patch).eq("id", id);
  if (error) adminRedirect("tab=reservations&error=update");

  adminRedirect("tab=reservations&ok=1");
}
