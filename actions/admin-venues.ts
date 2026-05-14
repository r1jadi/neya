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

export async function approveVenue(formData: FormData) {
  await requireAdmin();
  const venueId = String(formData.get("venue_id") ?? "");
  if (!venueId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("venues").update({ approved: true, updated_at: new Date().toISOString() }).eq("id", venueId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
  redirect("/admin?tab=venues&approved=1");
}
