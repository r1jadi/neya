"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { datetimeLocalToUtcIso } from "@/lib/event-dates";
import { slugify } from "@/lib/slug";

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

function parseSocialLinks(raw: string | null): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function adminRedirect(params: string) {
  redirect(`/admin?${params}`);
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
    category: String(formData.get("category") ?? "club").slice(0, 32),
    description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
    address: String(formData.get("address") ?? "").trim().slice(0, 240) || null,
    lat: formData.get("lat") ? Number(formData.get("lat")) : null,
    lng: formData.get("lng") ? Number(formData.get("lng")) : null,
    image_url: String(formData.get("image_url") ?? "").trim().slice(0, 2000) || null,
    gallery_urls: parseJsonArray(String(formData.get("gallery_urls") ?? "")),
    music_genres: parseJsonArray(String(formData.get("music_genres") ?? "")),
    social_links: parseSocialLinks(String(formData.get("social_links") ?? "")),
    reservations_enabled: formData.get("reservations_enabled") === "on",
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
    const { error } = await admin.from("venues").insert({ ...payload, slug, approved: payload.approved });
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
  if (!title || !venueId || !startsAt) adminRedirect("tab=events&error=fields");

  const endsLocal = String(formData.get("ends_at") ?? "").trim();
  const endsAt = endsLocal ? datetimeLocalToUtcIso(endsLocal) : null;
  if (endsLocal && !endsAt) adminRedirect("tab=events&error=fields");

  const admin = createAdminClient();
  const payload = {
    title,
    venue_id: venueId,
    description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    genre: String(formData.get("genre") ?? "mixed").slice(0, 32),
    image_url: String(formData.get("image_url") ?? "").trim().slice(0, 2000) || null,
    dj_lineup: parseJsonArray(String(formData.get("dj_lineup") ?? "")),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
    ticket_from_eur: formData.get("ticket_from_eur") ? Number(formData.get("ticket_from_eur")) : null,
    is_featured: formData.get("is_featured") === "on",
    is_listed_public: formData.get("is_listed_public") !== "off",
    is_hidden_premium: formData.get("is_hidden_premium") === "on",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin.from("events").update(payload).eq("id", id);
    if (error) adminRedirect("tab=events&error=update");
  } else {
    const slug = slugify(title);
    const { error } = await admin.from("events").insert({ ...payload, slug });
    if (error) adminRedirect("tab=events&error=insert");
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
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

  revalidatePath("/admin");
  adminRedirect("tab=tickets&ok=1");
}

export async function deleteTicket(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=tickets&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("tickets").delete().eq("id", id);
  if (error) adminRedirect("tab=tickets&error=delete");

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
  if (!id || !["pending", "confirmed", "rejected", "cancelled"].includes(status)) {
    adminRedirect("tab=reservations&error=fields");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reservations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) adminRedirect("tab=reservations&error=update");

  adminRedirect("tab=reservations&ok=1");
}
