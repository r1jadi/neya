"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleSaveEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  redirect(slug ? `/events/${slug}` : "/dashboard");
}
