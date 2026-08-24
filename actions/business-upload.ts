"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Image upload for venue owners / organizers. Gated on owning at least one
 * venue (or being a venue account) so the business dashboard can attach
 * posters to submissions. Storage writes go through the service role, but the
 * upload is only reachable by an authenticated user with venue access.
 */
export async function uploadVenueImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: owned } = await supabase.from("venues").select("id").eq("owner_id", user.id).limit(1);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, venue_id")
    .eq("id", user.id)
    .maybeSingle();
  const hasVenueAccess = Boolean(owned?.length) || profile?.role === "venue";
  if (!hasVenueAccess) return { error: "No venue access" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file" };
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { error: "File too large (max 50MB)" };
  if (!ALLOWED.has(file.type)) return { error: "Invalid type" };

  const folder = String(formData.get("folder") ?? "business")
    .replace(/[^a-z0-9-_]/gi, "")
    .slice(0, 32) || "business";
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;

  try {
    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("neya-media").upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { error: error.message };

    const { data } = admin.storage.from("neya-media").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    console.error("[neya] uploadVenueImage", e);
    return { error: "Upload failed" };
  }
}
