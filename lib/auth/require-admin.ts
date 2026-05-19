import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/auth/profile";
import { canAccessAdmin } from "@/lib/auth/permissions";

export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/admin");

  const profile = await getProfileForUser(user);
  if (!canAccessAdmin(profile, user)) redirect("/admin?error=forbidden");
  return user;
}

export async function getAdminUserOrNull() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const profile = await getProfileForUser(user);
  if (!canAccessAdmin(profile, user)) return null;
  return user;
}
