"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";

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
    const { data: o2 } = await admin.from("ticket_orders").select("id, status, used_at").eq("qr_payload", raw).maybeSingle();
    if (!o2) redirect("/business/scan?error=notfound");
    if (o2.status !== "paid") redirect("/business/scan?error=unpaid");
    if (o2.used_at) redirect("/business/scan?info=already");
    await admin.from("ticket_orders").update({ used_at: new Date().toISOString() }).eq("id", o2.id);
    revalidatePath("/business/scan");
    redirect("/business/scan?ok=1");
  };

  const { data: order, error } = await supabase
    .from("ticket_orders")
    .select("id, status, used_at, qr_payload, ticket_id")
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

  if (!adminUser && venue.owner_id !== user.id) redirect("/business/scan?error=forbidden");

  if (order.status !== "paid") redirect("/business/scan?error=unpaid");
  if (order.used_at) redirect("/business/scan?info=already");

  const { error: uErr } = await supabase.from("ticket_orders").update({ used_at: new Date().toISOString() }).eq("id", order.id);
  if (uErr) redirect("/business/scan?error=update");

  revalidatePath("/business/scan");
  redirect("/business/scan?ok=1");
}
