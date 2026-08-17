"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleSaveEvent(formData: FormData): Promise<{ saved: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Guests are sent to sign-in; the pending save is lost but the intent is
    // preserved by landing on the event page right after login.
    const slug = String(formData.get("event_slug") ?? "").trim();
    redirect(`/login?next=${encodeURIComponent(slug ? `/events/${slug}` : "/events")}`);
  }

  const eventId = String(formData.get("event_id") ?? "").trim();
  const slug = String(formData.get("event_slug") ?? "").trim();
  if (!eventId) redirect("/events");

  const { data: existing } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
  } else {
    await supabase.from("saved_events").insert({ user_id: user.id, event_id: eventId });
  }

  revalidatePath("/dashboard");
  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/");
  return { saved: !existing };
}

export async function toggleSaveVenue(formData: FormData): Promise<{ saved: boolean }> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  const venueId = String(formData.get("venue_id") ?? "").trim(); const slug = String(formData.get("venue_slug") ?? "").trim();
  if (!user) redirect(`/login?next=${encodeURIComponent(slug ? `/venues/${slug}` : "/events")}`); if (!venueId) redirect("/events");
  const { data: existing } = await supabase.from("saved_venues").select("venue_id").eq("user_id", user.id).eq("venue_id", venueId).maybeSingle();
  if (existing) await supabase.from("saved_venues").delete().eq("user_id", user.id).eq("venue_id", venueId); else await supabase.from("saved_venues").insert({ user_id: user.id, venue_id: venueId });
  revalidatePath("/dashboard"); revalidatePath("/saved"); if (slug) revalidatePath(`/venues/${slug}`); return { saved: !existing };
}
