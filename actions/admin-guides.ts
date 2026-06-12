"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { slugify } from "@/lib/slug";

function adminRedirect(params: string) {
  redirect(`/admin?${params}`);
}

function parseCategories(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export async function saveGuide(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  if (!title) adminRedirect("tab=guides&error=fields");

  const admin = createAdminClient();
  const durationRaw = formData.get("duration_days");
  const durationDays = durationRaw === "" || durationRaw == null ? null : Number(durationRaw);

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim().slice(0, 8000) || null,
    cover_image: String(formData.get("cover_image") ?? "").trim().slice(0, 2000) || null,
    duration_days: durationDays,
    duration_label: String(formData.get("duration_label") ?? "").trim().slice(0, 64) || null,
    location_type: String(formData.get("location_type") ?? "prishtina").slice(0, 32),
    location_name: String(formData.get("location_name") ?? "").trim().slice(0, 120) || null,
    price: Math.max(0, Number(formData.get("price") ?? 0) || 0),
    currency: String(formData.get("currency") ?? "EUR").slice(0, 8),
    difficulty: String(formData.get("difficulty") ?? "easy").slice(0, 16),
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    categories: parseCategories(String(formData.get("categories") ?? "")),
    best_season: String(formData.get("best_season") ?? "").trim().slice(0, 120) || null,
    daily_budget_eur: formData.get("daily_budget_eur") ? Number(formData.get("daily_budget_eur")) : null,
    total_budget_eur: formData.get("total_budget_eur") ? Number(formData.get("total_budget_eur")) : null,
    avg_visit_duration_minutes: formData.get("avg_visit_duration_minutes")
      ? Number(formData.get("avg_visit_duration_minutes"))
      : null,
    family_friendly: formData.get("family_friendly") === "on",
    updated_at: new Date().toISOString(),
  };

  let guideId = id;
  if (id) {
    const { error } = await admin.from("guides").update(payload).eq("id", id);
    if (error) adminRedirect("tab=guides&error=update");
  } else {
    const slug = slugify(title);
    const { data: inserted, error } = await admin.from("guides").insert({ ...payload, slug }).select("id").single();
    const newId = inserted?.id;
    if (error || !newId) adminRedirect("tab=guides&error=insert");
    guideId = newId;
  }

  revalidatePath("/guides");
  revalidatePath("/admin");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function deleteGuide(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!id) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("guides").delete().eq("id", id);
  if (error) adminRedirect("tab=guides&error=delete");

  revalidatePath("/guides");
  revalidatePath("/admin");
  adminRedirect("tab=guides&ok=1");
}

export async function toggleGuidePublished(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  if (!id) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  const { error } = await admin
    .from("guides")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) adminRedirect("tab=guides&error=update");

  revalidatePath("/guides");
  revalidatePath("/admin");
  adminRedirect("tab=guides&ok=1");
}

export async function saveGuideDay(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const guideId = String(formData.get("guide_id") ?? "").trim();
  const dayNumber = Math.max(1, Number(formData.get("day_number") ?? 1) || 1);
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000) || null;
  if (!guideId) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  if (id) {
    const { error } = await admin.from("guide_days").update({ day_number: dayNumber, title, description }).eq("id", id);
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=update`);
  } else {
    const { error } = await admin.from("guide_days").insert({ guide_id: guideId, day_number: dayNumber, title, description });
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=insert`);
  }

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function deleteGuideDay(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const guideId = String(formData.get("guide_id") ?? "");
  if (!id) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("guide_days").delete().eq("id", id);
  if (error) adminRedirect(`tab=guides&edit=${guideId}&error=delete`);

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function saveGuideStop(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const guideDayId = String(formData.get("guide_day_id") ?? "").trim();
  const guideId = String(formData.get("guide_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!guideDayId || !name) adminRedirect(`tab=guides&edit=${guideId}&error=fields`);

  const admin = createAdminClient();
  const payload = {
    name,
    description: String(formData.get("description") ?? "").trim().slice(0, 4000) || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    category: String(formData.get("category") ?? "landmarks").slice(0, 32),
    image: String(formData.get("image") ?? "").trim().slice(0, 2000) || null,
    estimated_visit_time: formData.get("estimated_visit_time") ? Number(formData.get("estimated_visit_time")) : null,
    order_index: Math.max(0, Number(formData.get("order_index") ?? 0) || 0),
  };

  if (id) {
    const { error } = await admin.from("guide_stops").update(payload).eq("id", id);
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=update`);
  } else {
    const { count } = await admin
      .from("guide_stops")
      .select("id", { count: "exact", head: true })
      .eq("guide_day_id", guideDayId);
    const { error } = await admin.from("guide_stops").insert({
      ...payload,
      guide_day_id: guideDayId,
      order_index: count ?? 0,
    });
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=insert`);
  }

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function deleteGuideStop(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const guideId = String(formData.get("guide_id") ?? "");
  if (!id) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("guide_stops").delete().eq("id", id);
  if (error) adminRedirect(`tab=guides&edit=${guideId}&error=delete`);

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function reorderGuideStops(formData: FormData) {
  await requireAdminUser();
  const guideId = String(formData.get("guide_id") ?? "");
  const orderJson = String(formData.get("order") ?? "[]");
  let order: string[] = [];
  try {
    order = JSON.parse(orderJson) as string[];
  } catch {
    adminRedirect(`tab=guides&edit=${guideId}&error=fields`);
  }

  const admin = createAdminClient();
  await Promise.all(
    order.map((stopId, index) =>
      admin.from("guide_stops").update({ order_index: index }).eq("id", stopId),
    ),
  );

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function saveGuideTransport(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const guideStopId = String(formData.get("guide_stop_id") ?? "").trim();
  const guideId = String(formData.get("guide_id") ?? "").trim();
  if (!guideStopId) adminRedirect(`tab=guides&edit=${guideId}&error=fields`);

  const admin = createAdminClient();
  const payload = {
    transport_type: String(formData.get("transport_type") ?? "walking").slice(0, 32),
    station_name: String(formData.get("station_name") ?? "").trim().slice(0, 200) || null,
    station_latitude: formData.get("station_latitude") ? Number(formData.get("station_latitude")) : null,
    station_longitude: formData.get("station_longitude") ? Number(formData.get("station_longitude")) : null,
    departure_frequency: String(formData.get("departure_frequency") ?? "").trim().slice(0, 200) || null,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    route_name: String(formData.get("route_name") ?? "").trim().slice(0, 200) || null,
    route_origin: String(formData.get("route_origin") ?? "").trim().slice(0, 120) || null,
    route_destination: String(formData.get("route_destination") ?? "").trim().slice(0, 120) || null,
    intercity_route_id: String(formData.get("intercity_route_id") ?? "").trim() || null,
  };

  if (id) {
    const { error } = await admin.from("guide_transports").update(payload).eq("id", id);
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=update`);
  } else {
    const { error } = await admin.from("guide_transports").insert({ ...payload, guide_stop_id: guideStopId });
    if (error) adminRedirect(`tab=guides&edit=${guideId}&error=insert`);
  }

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function deleteGuideTransport(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const guideId = String(formData.get("guide_id") ?? "");
  if (!id) adminRedirect("tab=guides&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("guide_transports").delete().eq("id", id);
  if (error) adminRedirect(`tab=guides&edit=${guideId}&error=delete`);

  revalidatePath("/guides");
  adminRedirect(`tab=guides&edit=${guideId}&ok=1`);
}

export async function saveIntercityRoute(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const admin = createAdminClient();
  const payload = {
    origin: String(formData.get("origin") ?? "Prishtina").trim().slice(0, 120),
    destination: String(formData.get("destination") ?? "").trim().slice(0, 120),
    route_name: String(formData.get("route_name") ?? "").trim().slice(0, 200),
    station_name: String(formData.get("station_name") ?? "").trim().slice(0, 200) || null,
    station_latitude: formData.get("station_latitude") ? Number(formData.get("station_latitude")) : null,
    station_longitude: formData.get("station_longitude") ? Number(formData.get("station_longitude")) : null,
    departure_frequency: String(formData.get("departure_frequency") ?? "").trim().slice(0, 200) || null,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    active: formData.get("active") === "on",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin.from("intercity_bus_routes").update(payload).eq("id", id);
    if (error) adminRedirect("tab=guides&error=update");
  } else {
    const { error } = await admin.from("intercity_bus_routes").insert(payload);
    if (error) adminRedirect("tab=guides&error=insert");
  }

  revalidatePath("/guides");
  adminRedirect("tab=guides&ok=1");
}
