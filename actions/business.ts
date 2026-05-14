"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `${base || "venue"}-${randomUUID().slice(0, 8)}`;
}

export async function requestVenueListing(formData: FormData) {
  const rl = await rateLimit("venue-request", 5, 3600);
  if (!rl.success) redirect("/business?error=rate");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");

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
    image_url:
      "https://images.unsplash.com/photo-1574391884726-a410171917de?auto=format&fit=crop&w=1200&q=80",
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

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const genre = String(formData.get("genre") ?? "mixed").slice(0, 32);
  if (!venueId || !title || !startsAt) redirect("/business?error=fields");

  const slug = slugify(title);

  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id, image_url")
    .eq("id", venueId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (vErr || !venue) redirect("/business?error=forbidden");

  const { error } = await supabase.from("events").insert({
    slug,
    venue_id: venue.id,
    title,
    starts_at: startsAt,
    genre,
    image_url: venue.image_url,
    crowd_count: 0,
    atmosphere_rating: 8.5,
    live_status: false,
  });

  if (error) redirect("/business?error=db");
  revalidatePath("/business");
  revalidatePath("/events");
  redirect("/business?event=1");
}
