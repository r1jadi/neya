"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withQueryParam } from "@/lib/admin/action-errors";
import { countSpotsUsed, resolveGuestlistAvailability } from "@/lib/guestlist/capacity";
import { parseGuestlistFormData } from "@/lib/guestlist/validation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  notifyGuestlistReceived,
  notifyGuestlistStatusChange,
  type GuestlistNotifyContext,
} from "@/lib/guestlist/notifications";
import { syncGuestlistEntryFromRequest } from "@/lib/guestlist/sync-entry";
import { getEventGuestlistMeta } from "@/services/guestlist";
import type { GuestlistRequestStatus, SubmitGuestlistResult } from "@/types/guestlist";
import { redirect } from "next/navigation";

const GL_STATUSES = new Set<GuestlistRequestStatus>(["pending", "approved", "rejected", "checked_in"]);

function adminRedirect(query: string) {
  redirect(`/admin?tab=guestlists&${query}`);
}

function logGuestlist(action: string, meta: Record<string, unknown>) {
  console.error(`[guestlist] ${action}`, meta);
}

async function loadNotifyContext(
  admin: ReturnType<typeof createAdminClient>,
  requestId: string,
): Promise<GuestlistNotifyContext | null> {
  const { data } = await admin
    .from("guestlist_requests")
    .select(
      "id, full_name, phone, email, group_size, status, events(title, slug, starts_at, venues(name))",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!data) return null;

  type EventJoin = {
    title: string;
    slug: string;
    starts_at: string | null;
    venues: { name: string } | { name: string }[] | null;
  };
  const ev = data.events as EventJoin | EventJoin[] | null;
  const event = Array.isArray(ev) ? ev[0] : ev;
  const venue = event?.venues;
  const venueName = Array.isArray(venue) ? venue[0]?.name : venue?.name;

  return {
    requestId: data.id,
    fullName: data.full_name,
    phone: data.phone,
    email: data.email,
    groupSize: data.group_size,
    status: data.status as GuestlistRequestStatus,
    eventTitle: event?.title ?? "Event",
    eventSlug: event?.slug ?? "",
    startsAt: event?.starts_at ?? null,
    venueName: venueName ?? null,
  };
}

function revalidateGuestlistPaths(eventSlug?: string) {
  revalidatePath("/admin");
  revalidatePath("/business/guestlists");
  revalidatePath("/venue/guestlists");
  if (eventSlug) revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/events");
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
  const { data: inserted, error } = await admin
    .from("guestlist_requests")
    .insert({
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
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    return { success: false, error: "A request with this phone is already pending or approved.", code: "duplicate" };
  }
  if (error) {
    logGuestlist("insert_failed", { eventId, error });
    return { success: false, error: "Could not submit request. Try again.", code: "server" };
  }

  if (inserted?.id) {
    const ctx = await loadNotifyContext(admin, inserted.id);
    if (ctx) {
      void notifyGuestlistReceived(ctx).catch((err) => logGuestlist("notify_received_failed", { err }));
    }
  }

  const { data: ev } = await admin.from("events").select("slug").eq("id", eventId).maybeSingle();
  revalidateGuestlistPaths(ev?.slug);
  return { success: true };
}

async function patchGuestlistRequest(
  requestId: string,
  patch: Record<string, unknown>,
  opts: { asAdmin?: boolean; revalidate?: boolean } = {},
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { asAdmin = false, revalidate = true } = opts;
  const client = asAdmin ? createAdminClient() : await createClient();
  const { error } = await client.from("guestlist_requests").update(patch).eq("id", requestId);

  if (error) {
    logGuestlist("patch_failed", { requestId, patch, asAdmin, code: error.code, message: error.message });
    return { ok: false, errorMessage: error.message };
  }

  if (revalidate) {
    revalidateGuestlistPaths();
  }
  return { ok: true };
}

async function afterGuestlistRequestChange(
  requestId: string,
  asAdmin: boolean,
): Promise<void> {
  const admin = createAdminClient();
  const sync = await syncGuestlistEntryFromRequest(admin, requestId);
  if (!sync.ok) {
    logGuestlist("sync_entry_failed", { requestId, error: sync.error });
  }

  const ctx = await loadNotifyContext(admin, requestId);
  if (ctx && ctx.status !== "pending") {
    void notifyGuestlistStatusChange(ctx).catch((err) =>
      logGuestlist("notify_status_failed", { err }),
    );
  }
  if (ctx?.eventSlug) {
    revalidateGuestlistPaths(ctx.eventSlug);
  } else {
    revalidateGuestlistPaths();
  }
}

async function applyGuestlistStatusUpdate(
  formData: FormData,
  opts: { asAdmin: boolean; defaultRedirect: string },
): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as GuestlistRequestStatus;
  const redirectTo = String(formData.get("redirect") ?? opts.defaultRedirect).trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : opts.defaultRedirect;

  if (!requestId || !GL_STATUSES.has(status)) {
    redirect(withQueryParam(safeRedirect, "error=invalid"));
  }

  let approvedBy: string | null = null;
  if (!opts.asAdmin) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(safeRedirect.split("?")[0] ?? safeRedirect)}`);
    approvedBy = user.id;
  } else {
    await requireAdminUser();
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      approvedBy = user?.id ?? null;
    } catch {
      approvedBy = null;
    }
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };

  if (status === "approved" || status === "rejected") {
    patch.approved_by = approvedBy;
  }
  if (status === "checked_in") {
    patch.checked_in_at = now;
    if (approvedBy) patch.approved_by = approvedBy;
  }

  const { ok, errorMessage } = await patchGuestlistRequest(requestId, patch, {
    asAdmin: opts.asAdmin,
    revalidate: false,
  });
  if (!ok) {
    const detail = errorMessage ? encodeURIComponent(errorMessage.slice(0, 160)) : "";
    redirect(
      withQueryParam(
        safeRedirect,
        detail ? `error=guestlist_update&detail=${detail}` : "error=guestlist_update",
      ),
    );
  }

  await afterGuestlistRequestChange(requestId, opts.asAdmin);
  redirect(withQueryParam(safeRedirect, "ok=1"));
}

export async function updateGuestlistRequestStatus(formData: FormData) {
  await applyGuestlistStatusUpdate(formData, {
    asAdmin: false,
    defaultRedirect: "/business/guestlists",
  });
}

export async function updateGuestlistRequestStatusAdmin(formData: FormData) {
  await applyGuestlistStatusUpdate(formData, {
    asAdmin: true,
    defaultRedirect: "/admin?tab=guestlists",
  });
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
  if (!requestId) redirect(withQueryParam(safeRedirect, "error=invalid"));

  const { error } = await supabase.from("guestlist_requests").delete().eq("id", requestId);
  if (error) {
    logGuestlist("delete_failed", { requestId, message: error.message });
    redirect(withQueryParam(safeRedirect, "error=delete"));
  }

  const admin = createAdminClient();
  await admin.from("guestlist_entries").delete().eq("guestlist_request_id", requestId);
  revalidateGuestlistPaths();
  redirect(withQueryParam(safeRedirect, "ok=1"));
}

export async function deleteGuestlistRequestAdmin(formData: FormData) {
  await requireAdminUser();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "/admin?tab=guestlists").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/admin?tab=guestlists";
  if (!requestId) redirect(withQueryParam(safeRedirect, "error=invalid"));

  const admin = createAdminClient();
  const { error } = await admin.from("guestlist_requests").delete().eq("id", requestId);
  if (error) {
    logGuestlist("admin_delete_failed", { requestId, message: error.message });
    redirect(withQueryParam(safeRedirect, "error=delete"));
  }

  await admin.from("guestlist_entries").delete().eq("guestlist_request_id", requestId);
  revalidateGuestlistPaths();
  redirect(withQueryParam(safeRedirect, "ok=1"));
}

async function approveGuestlistRequestCore(
  formData: FormData,
  redirectPath: string,
  asAdmin: boolean,
): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) redirect(withQueryParam(redirectPath, "error=invalid"));

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("guestlist_requests")
    .select("id, event_id, group_size, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!row) redirect(withQueryParam(redirectPath, "error=guestlist_missing"));

  if (row.status !== "pending") {
    redirect(withQueryParam(redirectPath, "error=invalid"));
  }

  try {
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
        redirect(withQueryParam(redirectPath, "error=full"));
      }
    }
  } catch (err) {
    logGuestlist("approve_capacity_check_failed", { requestId, err });
    // Continue — capacity check is best-effort; do not block approval
  }

  const fd = new FormData();
  fd.set("request_id", requestId);
  fd.set("status", "approved");
  fd.set("redirect", redirectPath);

  if (asAdmin) {
    await applyGuestlistStatusUpdate(fd, { asAdmin: true, defaultRedirect: redirectPath });
  } else {
    await applyGuestlistStatusUpdate(fd, { asAdmin: false, defaultRedirect: redirectPath });
  }
}

export async function approveGuestlistRequestAdmin(formData: FormData) {
  await requireAdminUser();
  const redirectPath = String(formData.get("redirect") ?? "/admin?tab=guestlists").trim();
  await approveGuestlistRequestCore(formData, redirectPath, true);
}

export async function approveGuestlistRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");
  const redirectPath = String(formData.get("redirect") ?? "/business/guestlists").trim();
  await approveGuestlistRequestCore(formData, redirectPath, false);
}
