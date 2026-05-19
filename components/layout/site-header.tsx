import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/auth/profile";
import { canAccessAdmin, canAccessVenuePortal } from "@/lib/auth/permissions";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  let showBusiness = false;
  let showVenuePortal = false;
  let isAdmin = false;
  let isPremium = false;

  if (user) {
    const profile = await getProfileForUser(user);
    isAdmin = canAccessAdmin(profile, user);
    showVenuePortal = canAccessVenuePortal(profile);

    if (!showVenuePortal) {
      const { count } = await supabase
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      showBusiness = (count ?? 0) > 0;
    }

    isPremium = Boolean(profile?.is_premium);
  }

  return (
    <SiteHeaderClient
      userEmail={email}
      isAdmin={isAdmin}
      showBusiness={showBusiness}
      showVenuePortal={showVenuePortal}
      isPremium={isPremium}
    />
  );
}
