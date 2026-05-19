"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVenueUser } from "@/lib/auth/require-venue";

const RES_STATUSES = new Set(["pending", "pending_payment", "confirmed", "rejected", "cancelled"]);

export async function updateVenueReservationStatus(formData: FormData) {
  const { venueId } = await requireVenueUser("/venue/reservations");

  const id = String(formData.get("reservation_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !RES_STATUSES.has(status)) redirect("/venue/reservations?error=invalid");

  const supabase = await createClient();
  const { data: row } = await supabase.from("reservations").select("venue_id").eq("id", id).maybeSingle();
  if (!row || row.venue_id !== venueId) redirect("/venue/reservations?error=forbidden");

  const { error } = await supabase.from("reservations").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect("/venue/reservations?error=update");

  revalidatePath("/venue/reservations");
  redirect("/venue/reservations?ok=1");
}
