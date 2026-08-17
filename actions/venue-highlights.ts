"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/utils";

function adminRedirect(params: string): never {
  redirect(`/admin?${params}`);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A venue has one active highlight per week — deactivate any that overlap. */
async function deactivateOverlaps(
  admin: ReturnType<typeof createAdminClient>,
  venueId: string,
  weekStart: string,
  weekEnd: string,
  excludeId?: string,
): Promise<number> {
  const { data: conflicts } = await admin
    .from("venue_weekly_highlights")
    .select("id")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .lte("week_start", weekEnd)
    .gte("week_end", weekStart);
  const ids = (conflicts ?? [])
    .map((r) => (r as { id: string }).id)
    .filter((cid) => cid !== excludeId);
  if (!ids.length) return 0;
  await admin
    .from("venue_weekly_highlights")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  return ids.length;
}

export async function saveVenueHighlight(formData: FormData) {
  const user = await requireAdminUser();
  const id = String(formData.get("id") ?? "").trim();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const content = String(formData.get("content") ?? "").trim().slice(0, 600);
  const weekStart = String(formData.get("week_start") ?? "").trim();
  const weekEnd = String(formData.get("week_end") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim().slice(0, 2000) || null;
  const eventIdRaw = String(formData.get("event_id") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (
    !isUuid(venueId) ||
    !title ||
    !content ||
    !DATE_RE.test(weekStart) ||
    !DATE_RE.test(weekEnd) ||
    weekEnd < weekStart
  ) {
    adminRedirect("tab=venue-highlights&error=fields");
  }

  const eventId = eventIdRaw && isUuid(eventIdRaw) ? eventIdRaw : null;
  const editId = id && isUuid(id) ? id : "";
  const admin = createAdminClient();

  let replaced = 0;
  if (isActive) {
    replaced = await deactivateOverlaps(admin, venueId, weekStart, weekEnd, editId || undefined);
  }

  const payload = {
    venue_id: venueId,
    event_id: eventId,
    title,
    content,
    image_url: imageUrl,
    week_start: weekStart,
    week_end: weekEnd,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  if (editId) {
    const { error } = await admin.from("venue_weekly_highlights").update(payload).eq("id", editId);
    if (error) adminRedirect(`tab=venue-highlights&error=${isOverlapError(error.message) ? "overlap" : "update"}`);
  } else {
    const { error } = await admin
      .from("venue_weekly_highlights")
      .insert({ ...payload, created_by: user.id });
    if (error) adminRedirect(`tab=venue-highlights&error=${isOverlapError(error.message) ? "overlap" : "insert"}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  adminRedirect(`tab=venue-highlights&ok=${replaced ? "replaced" : "1"}`);
}

export async function toggleVenueHighlight(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) adminRedirect("tab=venue-highlights&error=missing");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("venue_weekly_highlights")
    .select("id, venue_id, week_start, week_end, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!row) adminRedirect("tab=venue-highlights&error=missing");

  const nextActive = !row.is_active;
  if (nextActive) {
    await deactivateOverlaps(admin, row.venue_id, row.week_start, row.week_end, id);
  }

  const { error } = await admin
    .from("venue_weekly_highlights")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) adminRedirect("tab=venue-highlights&error=update");

  revalidatePath("/");
  revalidatePath("/admin");
  adminRedirect("tab=venue-highlights&ok=1");
}

export async function deleteVenueHighlight(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) adminRedirect("tab=venue-highlights&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("venue_weekly_highlights").delete().eq("id", id);
  if (error) adminRedirect("tab=venue-highlights&error=delete");

  revalidatePath("/");
  revalidatePath("/admin");
  adminRedirect("tab=venue-highlights&ok=1");
}

function isOverlapError(message: string): boolean {
  return message.includes("no_overlap") || message.includes("23P01") || message.includes("conflict");
}
