"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logUserActivity } from "@/lib/activity-log";

const VIS = new Set(["public", "private", "friends"]);

export async function checkInAtVenue(formData: FormData) {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const venueSlug = String(formData.get("venue_slug") ?? "").trim();
  const backToVenue = (state: "rate" | "err") =>
    redirect(venueSlug ? `/venues/${venueSlug}?checkin=${state}` : "/events?error=checkin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(venueSlug ? `/venues/${venueSlug}` : "/venues")}`);

  const rl = await rateLimit(`checkin:${user.id}`, 30, 3600);
  if (!rl.success) backToVenue("rate");

  const visibilityRaw = String(formData.get("visibility") ?? "public").toLowerCase();
  const visibility = VIS.has(visibilityRaw) ? visibilityRaw : "public";

  if (!venueId) backToVenue("err");

  const { error } = await supabase.from("checkins").insert({
    user_id: user.id,
    venue_id: venueId,
    visibility,
  });

  if (error) backToVenue("err");

  await logUserActivity(supabase, user.id, "checked_in", "venue", venueId, { visibility });

  if (venueSlug) revalidatePath(`/venues/${venueSlug}`);
  revalidatePath("/");
  redirect(venueSlug ? `/venues/${venueSlug}?checkin=1` : "/?checkin=1");
}
