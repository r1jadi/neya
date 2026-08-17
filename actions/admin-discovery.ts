"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function cleanSlug(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
}

function cleanName(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().slice(0, 120);
}

export async function saveCity(formData: FormData) {
  await requireAdminUser();
  const slug = cleanSlug(formData.get("slug"));
  const name = cleanName(formData.get("name"));
  const countrySlug = cleanSlug(formData.get("country_slug"));
  const countryName = cleanName(formData.get("country_name"));
  const regionSlug = cleanSlug(formData.get("region_slug"));
  const regionName = cleanName(formData.get("region_name"));
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if (!slug || !name || !countrySlug || !countryName || !regionSlug || !regionName ||
    (latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
    redirect("/admin?tab=discovery&error=fields");
  }

  const { error } = await createAdminClient().from("cities").upsert({
    slug, name, country_slug: countrySlug, country_name: countryName,
    region_slug: regionSlug, region_name: regionName, latitude, longitude,
    is_active: formData.get("is_active") === "on", updated_at: new Date().toISOString(),
  }, { onConflict: "slug" });
  if (error) redirect("/admin?tab=discovery&error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/map");
  revalidatePath("/cities/[city]", "page");
  redirect("/admin?tab=discovery&ok=1");
}

export async function setCityActive(formData: FormData) {
  await requireAdminUser();
  const slug = cleanSlug(formData.get("slug"));
  if (!slug) redirect("/admin?tab=discovery&error=fields");
  const { error } = await createAdminClient().from("cities")
    .update({ is_active: String(formData.get("active")) === "true", updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) redirect("/admin?tab=discovery&error=update");
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/map");
  revalidatePath("/cities/[city]", "page");
  redirect("/admin?tab=discovery&ok=1");
}
