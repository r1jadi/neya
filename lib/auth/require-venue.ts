import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/auth/profile";
import { canAccessVenuePortal } from "@/lib/auth/permissions";
import type { UserProfile } from "@/types/auth";
import type { User } from "@supabase/supabase-js";

export type VenueSession = {
  user: User;
  profile: UserProfile;
  venueId: string;
};

export async function getVenueSessionOrNull(): Promise<VenueSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileForUser(user);
  if (!canAccessVenuePortal(profile) || !profile?.venue_id) return null;

  return { user, profile, venueId: profile.venue_id };
}

export async function requireVenueUser(nextPath = "/venue"): Promise<VenueSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const profile = await getProfileForUser(user);
  if (!profile?.account_active) {
    redirect("/login?error=inactive");
  }
  if (!canAccessVenuePortal(profile)) {
    redirect("/venue?error=forbidden");
  }

  return { user, profile, venueId: profile.venue_id! };
}
