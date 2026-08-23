"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { getProfileForUser } from "@/lib/auth/profile";
import { canAccessVenuePortal } from "@/lib/auth/permissions";

/**
 * Atomically claim a ticket: only succeeds when the order is still unused.
 * A conditional UPDATE (used_at IS NULL) is the single source of truth —
 * two simultaneous scans of the same QR can never both claim it.
 */
async function claimOne(admin: ReturnType<typeof createAdminClient>, orderId: string): Promise<"ok" | "already" | "error"> {
  const { data, error } = await admin
    .from("ticket_orders")
    .update({ used_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (error) return "error";
  return data ? "ok" : "already";
}

async function assertStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/business/scan");
  return { supabase, user, adminUser: isAdminEmail(user.email) };
}

export async function validateTicketAtDoor(formData: FormData) {
  const { supabase, user, adminUser } = await assertStaff();
  const raw = String(formData.get("qr_payload") ?? "").trim();
  if (!raw) redirect("/business/scan?error=empty");

  const runAdmin = async () => {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      redirect("/business/scan?error=config");
    }
    const { data: o2 } = await admin.from("ticket_orders").select("id, payment_status, used_at").eq("qr_payload", raw).maybeSingle();
    if (!o2) redirect("/business/scan?error=notfound");
    if (o2.payment_status !== "paid") redirect("/business/scan?error=unpaid");
    if (o2.used_at) redirect("/business/scan?info=already");
    const claimed = await claimOne(admin, o2.id);
    if (claimed === "error") redirect("/business/scan?error=update");
    if (claimed === "already") redirect("/business/scan?info=already");
    revalidatePath("/business/scan");
    redirect("/business/scan?ok=1");
  };

  const profile = await getProfileForUser(user);
  const assignedVenueId = canAccessVenuePortal(profile) ? profile?.venue_id : null;

  const { data: order, error } = await supabase
    .from("ticket_orders")
    .select("id, payment_status, used_at, qr_payload, ticket_id")
    .eq("qr_payload", raw)
    .maybeSingle();

  if (error || !order) {
    if (adminUser) {
      await runAdmin();
      return;
    }
    redirect("/business/scan?error=notfound");
  }

  const { data: ticket } = await supabase.from("tickets").select("event_id").eq("id", order.ticket_id).maybeSingle();
  if (!ticket?.event_id) redirect("/business/scan?error=notfound");

  const { data: ev } = await supabase.from("events").select("venue_id").eq("id", ticket.event_id).maybeSingle();
  if (!ev?.venue_id) redirect("/business/scan?error=notfound");

  const { data: venue } = await supabase.from("venues").select("owner_id").eq("id", ev.venue_id).maybeSingle();
  if (!venue) redirect("/business/scan?error=notfound");

  if (!adminUser && venue.owner_id !== user.id && assignedVenueId !== ev.venue_id) {
    redirect("/business/scan?error=forbidden");
  }

  if (order.payment_status !== "paid") redirect("/business/scan?error=unpaid");
  if (order.used_at) redirect("/business/scan?info=already");

  const claimed = await claimOne(createAdminClient(), order.id);
  if (claimed === "error") redirect("/business/scan?error=update");
  if (claimed === "already") redirect("/business/scan?info=already");

  revalidatePath("/business/scan");
  redirect("/business/scan?ok=1");
}
