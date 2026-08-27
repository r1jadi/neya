"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";

export async function toggleEventFeatured(formData: FormData) {
  await requireAdminUser();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_featured: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  redirect("/admin?tab=events&ok=1");
}

export async function toggleEventPremiumHidden(formData: FormData) {
  await requireAdminUser();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_hidden_premium: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  redirect("/admin?tab=events&ok=1");
}

export async function toggleEventListed(formData: FormData) {
  await requireAdminUser();
  const eventId = String(formData.get("event_id") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  if (!eventId) redirect("/admin?error=missing");

  const admin = createAdminClient();
  const { error } = await admin.from("events").update({ is_listed_public: on, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) redirect("/admin?error=update");

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  redirect("/admin?tab=events&ok=1");
}

export async function updateEventSubmissionStatus(formData: FormData) {
  const adminUser = await requireAdminUser();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const status = String(formData.get("submission_status") ?? "").trim();
  if (!eventId || !["draft", "submitted", "pending_review", "approved", "rejected", "published", "archived"].includes(status)) redirect("/admin?tab=events&error=fields");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { submission_status: status, updated_at: now };
  if (["approved", "published", "rejected", "archived"].includes(status)) { patch.reviewed_at = now; patch.reviewed_by = adminUser.id; }
  // Public discovery lists events with submission_status approved OR published.
  // "Approved" stays visible (that is the point of approving a submission);
  // only draft/submitted/pending/rejected/archived are taken off the site.
  if (["approved", "published"].includes(status)) patch.is_listed_public = true;
  else patch.is_listed_public = false;
  if (status === "archived") patch.archived_at = now;
  const admin = createAdminClient(); const { error } = await admin.from("events").update(patch).eq("id", eventId);
  if (error) redirect("/admin?tab=events&error=update");
  revalidatePath("/"); revalidatePath("/events"); revalidatePath("/events/[slug]", "page"); revalidatePath("/admin"); redirect("/admin?tab=events&ok=1");
}

export async function verifyEventSource(formData: FormData) {
  const adminUser = await requireAdminUser(); const sourceId = String(formData.get("source_id") ?? ""); const verified = String(formData.get("verified") ?? "") === "true";
  const note = String(formData.get("verification_note") ?? "").trim().slice(0, 1000);
  if (!sourceId || (verified && note.length < 3)) redirect("/admin?tab=events&error=fields"); const admin = createAdminClient();
  const { error } = await admin.from("event_sources").update({ is_verified: verified, verification_note: verified ? note : null, verified_at: verified ? new Date().toISOString() : null, verified_by: verified ? adminUser.id : null }).eq("id", sourceId);
  if (error) redirect("/admin?tab=events&error=update"); revalidatePath("/admin"); redirect("/admin?tab=events&ok=1");
}

export async function grantPremiumByUserId(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) redirect("/admin?tab=premium&error=id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_premium: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) redirect("/admin?tab=premium&error=update");

  redirect("/admin?tab=premium&ok=1");
}
