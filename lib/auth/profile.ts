import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import type { UserProfile, UserRole } from "@/types/auth";
import type { User } from "@supabase/supabase-js";

const PROFILE_SELECT =
  "id, display_name, role, venue_id, account_active, is_admin, is_premium, onboarding_complete";

function mapProfile(row: {
  id: string;
  display_name: string | null;
  role: string;
  venue_id: string | null;
  account_active: boolean;
  is_admin: boolean;
  is_premium: boolean;
  onboarding_complete: boolean;
}): UserProfile {
  const role = (row.role === "venue" || row.role === "admin" ? row.role : "user") as UserRole;
  return {
    id: row.id,
    display_name: row.display_name,
    role,
    venue_id: row.venue_id,
    account_active: row.account_active,
    is_admin: row.is_admin,
    is_premium: row.is_premium ?? false,
    onboarding_complete: row.onboarding_complete ?? false,
  };
}

export async function getProfileForUserId(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle();
  if (!data) return null;
  return mapProfile(data as Parameters<typeof mapProfile>[0]);
}

export async function getProfileForUser(user: User): Promise<UserProfile | null> {
  const profile = await getProfileForUserId(user.id);
  if (!profile) return null;
  if (isAdminEmail(user.email) && profile.role !== "admin") {
    return { ...profile, role: "admin", is_admin: true };
  }
  return profile;
}

export async function getAdminProfileByUserId(userId: string): Promise<UserProfile | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle();
  if (!data) return null;
  return mapProfile(data as Parameters<typeof mapProfile>[0]);
}
