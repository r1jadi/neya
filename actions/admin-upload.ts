"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function uploadAdminImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdminUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file" };
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return { error: "File too large (max 50MB)" };
  if (!ALLOWED.has(file.type)) return { error: "Invalid type" };

  const folder = String(formData.get("folder") ?? "uploads").replace(/[^a-z0-9-_]/gi, "").slice(0, 32) || "uploads";
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
    console.error("[neya] uploadAdminImage", e);
    return { error: "Upload failed" };
  }
}
