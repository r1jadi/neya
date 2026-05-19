"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";

function accountsRedirect(params: string): never {
  redirect(`/admin?${params}`);
}

function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createVenueAccount(formData: FormData) {
  await requireAdminUser();

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim() || tempPassword();

  if (!email || !venueId) accountsRedirect("tab=venue-accounts&error=fields");

  const admin = createAdminClient();

  const { data: venue } = await admin.from("venues").select("id").eq("id", venueId).maybeSingle();
  if (!venue) accountsRedirect("tab=venue-accounts&error=venue");

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName || email.split("@")[0] },
  });

  const newUser = created.user;
  if (createErr || !newUser) {
    accountsRedirect(`tab=venue-accounts&error=${createErr?.message.includes("already") ? "duplicate" : "create"}`);
  }

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: newUser.id,
    display_name: displayName || email.split("@")[0],
    role: "venue",
    venue_id: venueId,
    account_active: true,
    onboarding_complete: true,
    is_admin: false,
    updated_at: new Date().toISOString(),
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(newUser.id);
    accountsRedirect("tab=venue-accounts&error=profile");
  }

  revalidatePath("/admin");
  accountsRedirect(`tab=venue-accounts&created=1&email=${encodeURIComponent(email)}&temp=1`);
}

export async function updateVenueAccount(formData: FormData) {
  await requireAdminUser();

  const userId = String(formData.get("user_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 120);
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const accountActive = formData.get("account_active") === "on";

  if (!userId || !venueId) accountsRedirect("tab=venue-accounts&error=fields");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: displayName || null,
      venue_id: venueId,
      role: "venue",
      account_active: accountActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("role", "venue");

  if (error) accountsRedirect("tab=venue-accounts&error=update");

  revalidatePath("/admin");
  accountsRedirect("tab=venue-accounts&ok=1");
}

export async function deactivateVenueAccount(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) accountsRedirect("tab=venue-accounts&error=missing");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ account_active: false, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "venue");

  if (error) accountsRedirect("tab=venue-accounts&error=update");

  revalidatePath("/admin");
  accountsRedirect("tab=venue-accounts&ok=1");
}

export async function deleteVenueAccount(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) accountsRedirect("tab=venue-accounts&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) accountsRedirect("tab=venue-accounts&error=delete");

  revalidatePath("/admin");
  accountsRedirect("tab=venue-accounts&ok=1");
}

export async function sendVenueAccountPasswordReset(formData: FormData) {
  await requireAdminUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) accountsRedirect("tab=venue-accounts&error=fields");

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/account?reset=1` },
  });

  if (error) accountsRedirect("tab=venue-accounts&error=reset");

  revalidatePath("/admin");
  accountsRedirect("tab=venue-accounts&reset=1");
}

export async function setVenueAccountPassword(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!userId || password.length < 8) accountsRedirect("tab=venue-accounts&error=password");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) accountsRedirect("tab=venue-accounts&error=password");

  revalidatePath("/admin");
  accountsRedirect("tab=venue-accounts&ok=1");
}
