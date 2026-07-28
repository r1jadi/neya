"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertNotVenueAccount } from "@/lib/auth/assert-not-venue-account";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { datetimeLocalToUtcIso } from "@/lib/event-dates";
import { slugify } from "@/lib/slug";
import { MUSIC_GENRES } from "@/types";

export async function requestVenueListing(formData: FormData) {
  const rl = await rateLimit("venue-request", 5, 3600);
  if (!rl.success) redirect("/business?error=rate");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");
  await assertNotVenueAccount(user.id);

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const category = String(formData.get("category") ?? "club").slice(0, 32);
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
  const rl = await rateLimit("event-create", 15, 3600);
  if (!rl.success) redirect("/business?error=rate");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");
  await assertNotVenueAccount(user.id);

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const startsAtLocal = String(formData.get("starts_at") ?? "").trim();
  const startsAt = datetimeLocalToUtcIso(startsAtLocal);
  const genreRaw = String(formData.get("genre") ?? "other").slice(0, 32);
  const genre = MUSIC_GENRES.some((option) => option.id === genreRaw) ? genreRaw : "other";
  if (!title || !startsAt) redirect("/business?error=fields");

  const slug = slugify(title);

  let venue: { id: string; image_url: string | null } | null = null;
  if (venueId) {
    const { data, error: vErr } = await supabase
      .from("venues")
      .select("id, image_url")
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
    genre,
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
