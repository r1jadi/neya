"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertNotVenueAccount } from "@/lib/auth/assert-not-venue-account";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { datetimeLocalToUtcIso } from "@/lib/event-dates";
import { slugify } from "@/lib/slug";
import { isVenueCategory, MUSIC_GENRES } from "@/types";
import { EVENT_CATEGORIES } from "@/lib/discovery";

export async function requestVenueListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");
  await assertNotVenueAccount(user.id);

  const rl = await rateLimit(`venue-request:${user.id}`, 5, 3600);
  if (!rl.success) redirect("/business?error=rate");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const categoryRaw = String(formData.get("category") ?? "nightclub").slice(0, 32);
  const category = isVenueCategory(categoryRaw) ? categoryRaw : "other";
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const address = String(formData.get("address") ?? "").trim().slice(0, 240);
  if (!name) redirect("/business?error=fields");

  const slug = slugify(name);

  const { error } = await supabase.from("venues").insert({
    slug,
    name,
    city_slug: "prishtina",
    category,
    description: description || null,
    address: address || null,
    owner_id: user.id,
    approved: false,
    image_url: null,
  });

  if (error) redirect("/business?error=db");
  revalidatePath("/business");
  revalidatePath("/admin");
  redirect("/business?created=1");
}

export async function createVenueEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");
  await assertNotVenueAccount(user.id);

  const rl = await rateLimit(`event-create:${user.id}`, 15, 3600);
  if (!rl.success) redirect("/business?error=rate");

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();
  const startsAt = datetimeLocalToUtcIso(startsAtLocal);
  const genreRaw = String(formData.get("genre") ?? "other").slice(0, 32);
  const genre = MUSIC_GENRES.some((option) => option.id === genreRaw) ? genreRaw : "other";
  const categoryRaw = String(formData.get("category") ?? "nightlife");
  const category = EVENT_CATEGORIES.some((item) => item.id === categoryRaw) ? categoryRaw : "other";
  const citySlug = String(formData.get("city_slug") ?? "prishtina").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64) || "prishtina";
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000) || null;
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  if (!title || !startsAt) redirect("/business?error=fields");

  const slug = slugify(title);

  let venue: { id: string; image_url: string | null; city_slug: string | null } | null = null;
  if (venueId) {
    const { data, error: vErr } = await supabase
      .from("venues")
      .select("id, image_url, city_slug")
      .eq("id", venueId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (vErr || !data) redirect("/business?error=forbidden");
    venue = data;
  }

  const { error } = await supabase.from("events").insert({
    slug,
    venue_id: venue?.id ?? null,
    title,
    starts_at: startsAt,
    ends_at: endsAt ? datetimeLocalToUtcIso(endsAt) : null,
    genre,
    category,
    city_slug: venue?.city_slug ?? citySlug,
    tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim().slice(0, 48)).filter(Boolean).slice(0, 20),
    is_free: formData.get("is_free") === "on",
    description,
    submission_status: "pending_review",
    is_listed_public: false,
    image_url: venue?.image_url ?? null,
    crowd_count: 0,
    atmosphere_rating: 8.5,
    live_status: false,
  });

  if (error) redirect("/business?error=db");
  revalidatePath("/business");
  revalidatePath("/events");
  redirect("/business?event=1");
}
