import { isAdminEmail } from "@/lib/auth/admin";
import type { UserProfile } from "@/types/auth";
import type { User } from "@supabase/supabase-js";

export function isAdminProfile(profile: UserProfile | null, email?: string | null): boolean {
  if (email && isAdminEmail(email)) return true;
  if (!profile?.account_active) return false;
  return profile.role === "admin" || profile.is_admin;
}

export function isVenueProfile(profile: UserProfile | null): boolean {
  if (!profile?.account_active) return false;
  return profile.role === "venue" && Boolean(profile.venue_id);
}

export function isRegularUserProfile(profile: UserProfile | null): boolean {
  if (!profile) return true;
  return profile.role === "user";
}

export function canAccessAdmin(profile: UserProfile | null, user?: User | null): boolean {
  return isAdminProfile(profile, user?.email);
}

export function canAccessVenuePortal(profile: UserProfile | null): boolean {
  return isVenueProfile(profile);
}

export function venueScopeIds(profile: UserProfile | null): string[] {
  if (!profile || !isVenueProfile(profile) || !profile.venue_id) return [];
  return [profile.venue_id];
}
