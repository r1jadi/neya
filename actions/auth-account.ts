"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/env";

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  if (!email || password.length < 6) redirect("/register?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getPublicSiteUrl()}/auth/callback`,
      data: { full_name: displayName || email.split("@")[0] },
    },
  });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  redirect("/register?checkEmail=1");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=invalid");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getPublicSiteUrl()}/update-password`,
  });
  redirect("/forgot-password?sent=1");
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const genres = formData.getAll("genre").map((g) => String(g)).filter(Boolean).slice(0, 12);
  const city = String(formData.get("city_slug") ?? "prishtina").slice(0, 40);

  const { error } = await supabase
    .from("profiles")
    .update({
      music_genres: genres,
      city_slug: city,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect("/onboarding?error=1");
  revalidatePath("/", "layout");
  redirect("/events");
}
