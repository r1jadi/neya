"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const VIS = new Set(["public", "private", "friends"]);

export async function checkInAtVenue(formData: FormData) {
  const rl = await rateLimit("checkin", 30, 3600);
  if (!rl.success) redirect("/events?error=rate");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const visibilityRaw = String(formData.get("visibility") ?? "public").toLowerCase();
  const visibility = VIS.has(visibilityRaw) ? visibilityRaw : "public";
  const venueSlug = String(formData.get("venue_slug") ?? "").trim();

  if (!venueId) redirect("/events?error=checkin");

  const { error } = await supabase.from("checkins").insert({
    user_id: user.id,
    venue_id: venueId,
    visibility,
  });

  if (error) redirect(venueSlug ? `/venues/${venueSlug}?checkin=err` : "/events?error=checkin");

  if (venueSlug) revalidatePath(`/venues/${venueSlug}`);
  redirect(venueSlug ? `/venues/${venueSlug}?checkin=1` : "/?checkin=1");
}
