"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function parseScore(raw: FormDataEntryValue | null) {
  const n = parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n)) return null;
  return clamp(n, 1, 10);
}

export async function submitAtmosphereReview(formData: FormData) {
  const rl = await rateLimit("atmosphere", 20, 120);
  if (!rl.success) redirect("/events?error=rate");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/events");

  const eventId = String(formData.get("event_id") ?? "").trim();
  const venueIdRaw = String(formData.get("venue_id") ?? "").trim();
  const venueId = venueIdRaw.length ? venueIdRaw : null;
  const slug = String(formData.get("event_slug") ?? "").trim();

  const music = parseScore(formData.get("music_quality"));
  const crowd = parseScore(formData.get("crowd_energy"));
  const line = parseScore(formData.get("line_wait"));
  const vibe = parseScore(formData.get("overall_vibe"));

  if (!eventId || !vibe) redirect(slug ? `/events/${slug}?error=vote` : "/events?error=vote");

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    event_id: eventId,
    venue_id: venueId,
    music_quality: music ?? undefined,
    crowd_energy: crowd ?? undefined,
    line_wait: line ?? undefined,
    overall_vibe: vibe,
  });

  if (error) redirect(slug ? `/events/${slug}?error=vote` : "/events?error=vote");

  if (slug) revalidatePath(`/events/${slug}`);
  redirect(slug ? `/events/${slug}?voted=1` : "/events?voted=1");
}
