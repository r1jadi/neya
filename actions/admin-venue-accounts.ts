"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";

function accountsRedirect(params: string): never {
  redirect(`/admin?${params}`);
}

function logVenueAccount(action: string, meta: Record<string, unknown>) {
  console.error(`[venue-account] ${action}`, meta);
}

function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveVenueProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  payload: {
    display_name: string;
    venue_id: string;
  },
): Promise<{ ok: true } | { ok: false; code: string; detail?: string }> {
  const profileRow = {
    id: userId,
    display_name: payload.display_name,
    role: "venue" as const,
    venue_id: payload.venue_id,
    account_active: true,
    onboarding_complete: true,
    is_admin: false,
    updated_at: new Date().toISOString(),
  };

  // Auth trigger may insert a default row after createUser — upsert with retries handles the race.
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await admin
      .from("profiles")
      .upsert(profileRow, { onConflict: "id" })
      .select("id, role, venue_id")
      .maybeSingle();

    if (!error && data?.role === "venue" && data.venue_id === payload.venue_id) {
      return { ok: true };
    }

    if (error?.code === "23505" && error.message.includes("profiles_one_active_venue_account")) {
      return { ok: false, code: "profile_venue_taken", detail: error.message };
    }

    if (error) {
      logVenueAccount("profile_upsert_failed", {
        userId,
        attempt,
        code: error.code,
        message: error.message,
      });
    }

    if (attempt < 5) await delay(80 * (attempt + 1));
  }

  return verifyVenueProfileSaved(admin, userId, payload.venue_id);
}

async function verifyVenueProfileSaved(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  venueId: string,
): Promise<{ ok: true } | { ok: false; code: string; detail?: string }> {
  const { data, error } = await admin
    .from("profiles")
    .select("role, venue_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "profile", detail: error.message };
  }

  if (!data) {
    return { ok: false, code: "profile", detail: "Profile row missing after create." };
  }

  if (data.role !== "venue" || data.venue_id !== venueId) {
    return {
      ok: false,
      code: "profile",
      detail:
        data.role !== "venue"
          ? "Profile saved but venue role was not applied. Run DB migration 20240522120000_fix_profile_trigger_service_role.sql."
          : "Profile saved but venue_id was not linked. Run DB migrations (venue role columns).",
    };
  }

  return { ok: true };
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

  const { data: existingVenueAccount } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "venue")
    .eq("venue_id", venueId)
    .eq("account_active", true)
    .maybeSingle();

  if (existingVenueAccount) {
    accountsRedirect("tab=venue-accounts&error=profile_venue_taken");
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName || email.split("@")[0] },
  });

  const newUser = created?.user;
  if (createErr || !newUser) {
    logVenueAccount("auth_create_failed", { email, message: createErr?.message });
    accountsRedirect(
      `tab=venue-accounts&error=${createErr?.message?.toLowerCase().includes("already") ? "duplicate" : "create"}`,
    );
  }

  const profileResult = await saveVenueProfile(admin, newUser.id, {
    display_name: displayName || email.split("@")[0],
    venue_id: venueId,
  });

  if (!profileResult.ok) {
    await admin.auth.admin.deleteUser(newUser.id);
    const detail = profileResult.detail ? encodeURIComponent(profileResult.detail.slice(0, 160)) : "";
    accountsRedirect(
      `tab=venue-accounts&error=${profileResult.code}${detail ? `&detail=${detail}` : ""}`,
    );
  }

  logVenueAccount("created", { userId: newUser.id, email, venueId });
  revalidatePath("/admin");
  revalidatePath("/admin", "page");
  accountsRedirect(`tab=venue-accounts&created=1&email=${encodeURIComponent(email)}`);
}

export async function updateVenueAccount(formData: FormData) {
  await requireAdminUser();

  const userId = String(formData.get("user_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 120);
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const accountActive = formData.get("account_active") === "on";

  if (!userId || !venueId) accountsRedirect("tab=venue-accounts&error=fields");

  const admin = createAdminClient();

  if (accountActive) {
    const { data: conflict } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "venue")
      .eq("venue_id", venueId)
      .eq("account_active", true)
      .neq("id", userId)
      .maybeSingle();
    if (conflict) accountsRedirect("tab=venue-accounts&error=profile_venue_taken");
  }

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

  if (error) {
    logVenueAccount("update_failed", { userId, message: error.message });
    accountsRedirect(`tab=venue-accounts&error=update&detail=${encodeURIComponent(error.message.slice(0, 160))}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "page");
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

  if (error) {
    logVenueAccount("deactivate_failed", { userId, message: error.message });
    accountsRedirect("tab=venue-accounts&error=update");
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "page");
  accountsRedirect("tab=venue-accounts&ok=1");
}

export async function deleteVenueAccount(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) accountsRedirect("tab=venue-accounts&error=missing");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logVenueAccount("delete_failed", { userId, message: error.message });
    accountsRedirect("tab=venue-accounts&error=delete");
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "page");
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
    options: { redirectTo: `${siteUrl}/update-password` },
  });

  if (error) {
    logVenueAccount("reset_failed", { email, message: error.message });
    accountsRedirect("tab=venue-accounts&error=reset");
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "page");
  accountsRedirect("tab=venue-accounts&reset=1");
}

export async function setVenueAccountPassword(formData: FormData) {
  await requireAdminUser();
  const userId = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!userId || password.length < 8) accountsRedirect("tab=venue-accounts&error=password");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    logVenueAccount("set_password_failed", { userId, message: error.message });
    accountsRedirect("tab=venue-accounts&error=password");
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "page");
  accountsRedirect("tab=venue-accounts&ok=1");
}
