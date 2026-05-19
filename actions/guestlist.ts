"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { countSpotsUsed, resolveGuestlistAvailability } from "@/lib/guestlist/capacity";
import { parseGuestlistFormData } from "@/lib/guestlist/validation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { getEventGuestlistMeta } from "@/services/guestlist";
import type { GuestlistRequestStatus, SubmitGuestlistResult } from "@/types/guestlist";
import { redirect } from "next/navigation";

const GL_STATUSES = new Set<GuestlistRequestStatus>(["pending", "approved", "rejected", "checked_in"]);

function adminRedirect(query: string) {
  redirect(`/admin?tab=guestlists&${query}`);
}

export async function submitGuestlistRequest(formData: FormData): Promise<SubmitGuestlistResult> {
  const parsed = parseGuestlistFormData(formData);
  if ("success" in parsed) return parsed;

  const { eventId, firstName, lastName, fullName, phone, email, groupSize, notes } = parsed;

  const meta = await getEventGuestlistMeta(eventId);
  if (!meta?.guestlist) {
    return { success: false, error: "Guestlist is not open for this event.", code: "closed" };
  }
  if (!meta.availability?.isOpen) {
    if (meta.availability?.isFull) {
      return { success: false, error: "Guestlist is full.", code: "full" };
    }
    return { success: false, error: "Guestlist is closed.", code: "closed" };
  }

  const spotsAfter = (meta.availability.spotsUsed ?? 0) + groupSize;
  if (meta.guestlist.capacity != null && spotsAfter > meta.guestlist.capacity) {
    return { success: false, error: "Not enough spots left for your group size.", code: "full" };
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("guestlist_requests").insert({
    event_id: eventId,
    guestlist_id: meta.guestlist.id,
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    phone,
    email,
    group_size: groupSize,
    notes,
    status: "pending",
  });

  if (error?.code === "23505") {
    return { success: false, error: "A request with this phone is already pending or approved.", code: "duplicate" };
  }
  if (error) {
    return { success: false, error: "Could not submit request. Try again.", code: "server" };
  }

  revalidatePath(`/events`);
  return { success: true };
}

async function patchGuestlistRequest(
  requestId: string,
  patch: Record<string, unknown>,
  opts: { asAdmin?: boolean; revalidate?: boolean } = {},
): Promise<{ ok: boolean }> {
  const { asAdmin = false, revalidate = true } = opts;
  const { error } = asAdmin
    ? await createAdminClient().from("guestlist_requests").update(patch).eq("id", requestId)
    : await (await createClient()).from("guestlist_requests").update(patch).eq("id", requestId);
  if (error) return { ok: false };
  if (revalidate) {
    revalidatePath("/admin");
    revalidatePath("/business/guestlists");
  }
  return { ok: true };
}

export async function updateGuestlistRequestStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");

  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as GuestlistRequestStatus;
  const redirectTo = String(formData.get("redirect") ?? "/business/guestlists").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/business/guestlists";

  if (!requestId || !GL_STATUSES.has(status)) {
    redirect(`${safeRedirect}&error=invalid`);
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };

  if (status === "approved" || status === "rejected") {
    patch.approved_by = user.id;
  }
  if (status === "checked_in") {
    patch.checked_in_at = now;
    patch.approved_by = user.id;
  }

  const { ok } = await patchGuestlistRequest(requestId, patch, { asAdmin: false });
  if (!ok) redirect(`${safeRedirect}&error=update`);
  redirect(`${safeRedirect}&ok=1`);
}

export async function deleteGuestlistRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");

  const requestId = String(formData.get("request_id") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "/business/guestlists").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/business/guestlists";
  if (!requestId) redirect(`${safeRedirect}&error=invalid`);

  const { error } = await supabase.from("guestlist_requests").delete().eq("id", requestId);
  if (error) redirect(`${safeRedirect}&error=delete`);

  revalidatePath("/admin");
  revalidatePath("/business/guestlists");
  redirect(`${safeRedirect}&ok=1`);
}

export async function updateGuestlistRequestStatusAdmin(formData: FormData) {
  await requireAdminUser();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as GuestlistRequestStatus;
  const redirectTo = String(formData.get("redirect") ?? "/admin?tab=guestlists").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin?tab=guestlists";
  if (!requestId || !GL_STATUSES.has(status)) redirect(`${safeRedirect}&error=invalid`);

  let approvedBy: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    approvedBy = user?.id ?? null;
  } catch {
    approvedBy = null;
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "approved" || status === "rejected") patch.approved_by = approvedBy;
  if (status === "checked_in") {
    patch.checked_in_at = now;
    if (approvedBy) patch.approved_by = approvedBy;
  }

  const { ok } = await patchGuestlistRequest(requestId, patch, { asAdmin: true });
  if (!ok) redirect(`${safeRedirect}&error=update`);
  redirect(`${safeRedirect}&ok=1`);
}

export async function deleteGuestlistRequestAdmin(formData: FormData) {
  await requireAdminUser();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "/admin?tab=guestlists").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin?tab=guestlists";
  if (!requestId) redirect(`${safeRedirect}&error=invalid`);

  const { error } = await createAdminClient().from("guestlist_requests").delete().eq("id", requestId);
  if (error) redirect(`${safeRedirect}&error=delete`);

  revalidatePath("/admin");
  revalidatePath("/business/guestlists");
  redirect(`${safeRedirect}&ok=1`);
}

async function approveGuestlistRequestCore(formData: FormData, redirectPath: string) {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) redirect(`${redirectPath}&error=invalid`);

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("guestlist_requests")
    .select("id, event_id, group_size, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!row) redirect(`${redirectPath}&error=missing`);

  const meta = await getEventGuestlistMeta(row.event_id);
  if (meta?.guestlist?.capacity != null && meta.availability) {
    const { data: all } = await admin
      .from("guestlist_requests")
      .select("id, group_size, status")
      .eq("event_id", row.event_id);

    const others = (all ?? []).filter((r) => r.id !== requestId);
    const used = countSpotsUsed(others, true);
    const availability = resolveGuestlistAvailability(
      {
        capacity: meta.guestlist.capacity,
        isOpen: meta.guestlist.isOpen,
        requiresManualApproval: meta.guestlist.requiresManualApproval,
      },
      used,
    );
    if (availability.spotsLeft != null && row.group_size > availability.spotsLeft) {
      redirect(`${redirectPath}&error=full`);
    }
  }

  const fd = new FormData();
  fd.set("request_id", requestId);
  fd.set("status", "approved");
  fd.set("redirect", redirectPath);
  return updateGuestlistRequestStatus(fd);
}

export async function approveGuestlistRequestAdmin(formData: FormData) {
  await requireAdminUser();
  const redirectPath = String(formData.get("redirect") ?? "/admin?tab=guestlists").trim();
  return approveGuestlistRequestCore(formData, redirectPath);
}

export async function approveGuestlistRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");
  const redirectPath = String(formData.get("redirect") ?? "/business/guestlists").trim();
  return approveGuestlistRequestCore(formData, redirectPath);
}
