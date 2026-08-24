"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MUSIC_GENRES } from "@/types";

export async function updatePreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/preferences");

  const genres = formData
    .getAll("genre")
    .map((g) => String(g))
    .filter((genre) => MUSIC_GENRES.some((option) => option.id === genre))
    .slice(0, 12);
  const interests = formData
    .getAll("category")
    .map((g) => String(g))
    .filter(Boolean)
    .slice(0, 20);
  const city = String(formData.get("city_slug") ?? "prishtina").slice(0, 40);
  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = ageRaw ? Math.min(99, Math.max(16, parseInt(ageRaw, 10) || 0)) : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      music_genres: genres,
      interests: interests,
      city_slug: city,
      age: age && age >= 16 ? age : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect("/dashboard/preferences?error=1");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard/preferences?saved=1");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 80);

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect("/dashboard?error=profile");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard?saved=profile");
}
