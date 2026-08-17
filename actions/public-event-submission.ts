"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { datetimeLocalToUtcIso } from "@/lib/event-dates";
import { EVENT_CATEGORIES } from "@/lib/discovery";
import { MUSIC_GENRES } from "@/types";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/slug";

type Result = { ok: true } | { ok: false; error: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
function validUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }

export async function submitPublicEvent(formData: FormData): Promise<Result> {
  if (String(formData.get("company") ?? "").trim()) return { ok: true };
  const organizerEmail = String(formData.get("organizer_email") ?? "").trim().toLowerCase().slice(0, 320);
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const startsAt = datetimeLocalToUtcIso(String(formData.get("starts_at") ?? "").trim());
  const endsRaw = String(formData.get("ends_at") ?? "").trim(); const endsAt = endsRaw ? datetimeLocalToUtcIso(endsRaw) : null;
  if (!title || !startsAt || !EMAIL.test(organizerEmail) || (endsRaw && !endsAt)) return { ok: false, error: "Please provide an event name, valid contact email, and valid date/time." };
  if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) return { ok: false, error: "End time must be after the event start time." };
  const limit = await rateLimit(`public-event:${organizerEmail}`, 5, 3600); if (!limit.success) return { ok: false, error: "Too many submissions. Please try again later." };
  const city = String(formData.get("city_slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
  const category = String(formData.get("category") ?? "other"); const genre = String(formData.get("genre") ?? "other");
  const ticketUrl = String(formData.get("ticket_url") ?? "").trim().slice(0, 2000); const sourceUrl = String(formData.get("source_url") ?? "").trim().slice(0, 2000);
  if (!city || !EVENT_CATEGORIES.some((item) => item.id === category) || !MUSIC_GENRES.some((item) => item.id === genre) || (ticketUrl && !validUrl(ticketUrl)) || (sourceUrl && !validUrl(sourceUrl))) return { ok: false, error: "Check the city, category, genre, and any web links." };
  let imageUrl = String(formData.get("image_url") ?? "").trim().slice(0, 2000); if (imageUrl && !validUrl(imageUrl)) return { ok: false, error: "Image URL must be a valid web address." };
  const image = formData.get("image");
  try {
    const admin = createAdminClient();
    if (image instanceof File && image.size > 0) {
      if (image.size > Math.min(MAX_IMAGE_UPLOAD_BYTES, 10 * 1024 * 1024) || !IMAGE_TYPES.has(image.type)) return { ok: false, error: "Use a JPG, PNG, WebP, or GIF under 10MB." };
      const ext = image.name.split(".").pop()?.toLowerCase(); const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? "") ? ext : "jpg";
      const path = `event-submissions/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;
      const { error } = await admin.storage.from("neya-media").upload(path, Buffer.from(await image.arrayBuffer()), { contentType: image.type, upsert: false });
      if (error) return { ok: false, error: "We couldn't upload that image." };
      imageUrl = admin.storage.from("neya-media").getPublicUrl(path).data.publicUrl;
    }
    const socialLinks = Object.fromEntries(["instagram", "facebook", "website"].flatMap((key) => { const url = String(formData.get(`social_${key}`) ?? "").trim().slice(0, 2000); return url && validUrl(url) ? [[key, url]] : []; }));
    const { error } = await admin.from("events").insert({
      slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 6)}`, title, description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
      starts_at: startsAt, ends_at: endsAt, city_slug: city, category, genre, venue_name: String(formData.get("venue_name") ?? "").trim().slice(0, 160) || null,
      organizer_name: String(formData.get("organizer_name") ?? "").trim().slice(0, 160) || null, organizer_email: organizerEmail, organizer_phone: String(formData.get("organizer_phone") ?? "").trim().slice(0, 40) || null,
      performers: String(formData.get("lineup") ?? "").split(",").map((name) => name.trim()).filter(Boolean).slice(0, 30).map((name) => ({ name: name.slice(0, 160) })),
      dj_lineup: String(formData.get("lineup") ?? "").split(",").map((name) => name.trim().slice(0, 160)).filter(Boolean).slice(0, 30), ticket_from_eur: formData.get("ticket_from_eur") ? Math.max(0, Number(formData.get("ticket_from_eur")) || 0) : null,
      ticket_url: ticketUrl || null, source_url: sourceUrl || null, social_links: socialLinks, image_url: imageUrl || null, is_free: formData.get("is_free") === "on", is_listed_public: false, submission_status: "pending_review", submitted_at: new Date().toISOString(), crowd_count: 0, atmosphere_rating: 0, live_status: false,
    });
    if (error) { console.error("[neya] public event submission", error.message); return { ok: false, error: "We couldn't submit this event. Please try again." }; }
    return { ok: true };
  } catch (error) { console.error("[neya] public event submission", error); return { ok: false, error: "Submission is temporarily unavailable." }; }
}
