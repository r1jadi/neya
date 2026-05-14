import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const isAdmin = email ? isAdminEmail(email) : false;

  let showBusiness = false;
  let isPremium = false;
  if (user?.id) {
    const [{ count }, prof] = await Promise.all([
      supabase.from("venues").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      supabase.from("profiles").select("is_premium").eq("id", user.id).maybeSingle(),
    ]);
    showBusiness = (count ?? 0) > 0;
    isPremium = Boolean(prof.data?.is_premium);
  }

  return <SiteHeaderClient userEmail={email} isAdmin={isAdmin} showBusiness={showBusiness} isPremium={isPremium} />;
}
