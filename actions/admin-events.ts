"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/admin?error=forbidden");
  return user;
}

export async function toggleEventFeatured(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_featured: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  redirect("/admin?tab=events&ok=1");
}

export async function toggleEventPremiumHidden(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_hidden_premium: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  redirect("/admin?tab=events&ok=1");
}

export async function toggleEventListed(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_listed_public: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  redirect("/admin?tab=events&ok=1");
}

export async function grantPremiumByUserId(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) redirect("/admin?tab=premium&error=id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_premium: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) redirect("/admin?tab=premium&error=update");

  redirect("/admin?tab=premium&ok=1");
}
