"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { slugify } from "@/lib/slug";

export async function toggleFollowArtist(formData: FormData): Promise<{ following: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const artistId = String(formData.get("artist_id") ?? "").trim();
  const slug = String(formData.get("artist_slug") ?? "").trim();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(slug ? `/artists/${slug}` : "/artists")}`);
  }
  if (!artistId) redirect("/artists");

  const { data: existing } = await supabase
    .from("artist_follows")
    .select("artist_id")
    .eq("user_id", user.id)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) {
    await supabase.from("artist_follows").delete().eq("user_id", user.id).eq("artist_id", artistId);
  } else {
    await supabase.from("artist_follows").insert({ user_id: user.id, artist_id: artistId });
  }

  revalidatePath("/dashboard");
  revalidatePath("/artists");
  if (slug) revalidatePath(`/artists/${slug}`);
  revalidatePath("/");
  return { following: !existing };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

function adminRedirect(params: string) {
  redirect(`/admin?${params}`);
}

function parseList(raw: FormDataEntryValue | null): string[] {
  return (typeof raw === "string" ? raw : "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function optionalUrl(raw: FormDataEntryValue | null): string | null {
  const value = typeof raw === "string" ? raw.trim().slice(0, 2000) : "";
  return value || null;
}

export async function saveArtist(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) adminRedirect("tab=artists&error=fields");

  const admin = createAdminClient();
  const payload = {
    name,
    bio: String(formData.get("bio") ?? "").trim().slice(0, 6000) || null,
    short_bio: String(formData.get("short_bio") ?? "").trim().slice(0, 300) || null,
    profile_image: optionalUrl(formData.get("profile_image")),
    cover_image: optionalUrl(formData.get("cover_image")),
    genres: parseList(formData.get("genres")),
    instagram_url: optionalUrl(formData.get("instagram_url")),
    spotify_url: optionalUrl(formData.get("spotify_url")),
    soundcloud_url: optionalUrl(formData.get("soundcloud_url")),
    website_url: optionalUrl(formData.get("website_url")),
    is_verified: formData.get("is_verified") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_active: formData.get("is_active") !== "off",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin.from("artists").update(payload).eq("id", id);
    if (error) adminRedirect("tab=artists&error=update");
  } else {
    const { error } = await admin.from("artists").insert({ ...payload, slug: slugify(name) });
    if (error) adminRedirect("tab=artists&error=insert");
  }

  revalidatePath("/artists");
  revalidatePath("/admin");
  adminRedirect("tab=artists&ok=1");
}

export async function deleteArtist(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=artists&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("artists").delete().eq("id", id);
  if (error) adminRedirect("tab=artists&error=delete");

  revalidatePath("/artists");
  revalidatePath("/admin");
  adminRedirect("tab=artists&ok=1");
}
