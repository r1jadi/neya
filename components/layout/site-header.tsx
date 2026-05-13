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
  return <SiteHeaderClient userEmail={email} isAdmin={isAdmin} />;
}
