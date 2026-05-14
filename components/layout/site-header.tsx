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
  if (user?.id) {
    const { count } = await supabase
      .from("venues")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    showBusiness = (count ?? 0) > 0;
  }

  return <SiteHeaderClient userEmail={email} isAdmin={isAdmin} showBusiness={showBusiness} />;
}
