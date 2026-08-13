"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_POSTER_BYTES = 20 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function saveEventPoster(formData: FormData): Promise<{ url?: string; generatedAt?: string; error?: string }> {
  await requireAdminUser();

  const eventId = String(formData.get("event_id") ?? "").trim();
  const poster = formData.get("poster");
  if (!UUID_RE.test(eventId)) return { error: "Invalid event" };
  if (!(poster instanceof File) || poster.size === 0) return { error: "No poster image" };
  if (poster.type !== "image/png") return { error: "Poster must be a PNG" };
  if (poster.size > MAX_POSTER_BYTES) return { error: "Poster is too large (max 20MB)" };

  const posterBytes = Buffer.from(await poster.arrayBuffer());
  if (posterBytes.length < PNG_SIGNATURE.length || !posterBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { error: "Poster must be a valid PNG" };
  }

  const admin = createAdminClient();
  const { data: event, error: eventError } = await admin.from("events").select("id, slug").eq("id", eventId).maybeSingle();
  if (eventError || !event) return { error: "Event not found" };

  const path = `event-posters/${eventId}/poster.png`;
  try {
    const { error: uploadError } = await admin.storage.from("neya-media").upload(path, posterBytes, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });
    if (uploadError) {
      console.error("[neya] poster upload failed", uploadError);
      return { error: "Poster upload failed. Please try again." };
    }

    const generatedAt = new Date().toISOString();
    const { data: publicUrl } = admin.storage.from("neya-media").getPublicUrl(path);
    const posterUrl = `${publicUrl.publicUrl}?v=${encodeURIComponent(generatedAt)}`;
    const { error: updateError } = await admin
      .from("events")
      .update({ poster_url: posterUrl, poster_generated_at: generatedAt, updated_at: generatedAt })
      .eq("id", eventId);
    if (updateError) {
      console.error("[neya] poster metadata update failed", updateError);
      return { error: "Poster could not be saved. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${event.slug}`);
    revalidatePath("/admin");
    return { url: posterUrl, generatedAt };
  } catch (error) {
    console.error("[neya] saveEventPoster", error);
    return { error: "Poster upload failed" };
  }
}
