"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const RES_STATUSES = new Set(["pending", "pending_payment", "confirmed", "rejected", "cancelled"]);
const GL_STATUSES = new Set(["pending", "approved", "rejected", "waitlist"]);

export async function updateReservationStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/reservations");

  const id = String(formData.get("reservation_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !RES_STATUSES.has(status)) redirect("/business/reservations?error=invalid");

  const { error } = await supabase.from("reservations").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect("/business/reservations?error=update");

  revalidatePath("/business/reservations");
  revalidatePath("/dashboard");
  redirect("/business/reservations?ok=1");
}

export async function updateGuestlistEntryStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business/guestlists");

  const id = String(formData.get("entry_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !GL_STATUSES.has(status)) redirect("/business/guestlists?error=invalid");

  const { error } = await supabase.from("guestlist_entries").update({ status }).eq("id", id);
  if (error) redirect("/business/guestlists?error=update");

  revalidatePath("/business/guestlists");
  redirect("/business/guestlists?ok=1");
}
