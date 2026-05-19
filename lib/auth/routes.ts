import type { UserProfile } from "@/types/auth";
import { canAccessAdmin, canAccessVenuePortal, isVenueProfile } from "@/lib/auth/permissions";

const ADMIN_PREFIX = "/admin";
const VENUE_PREFIX = "/venue";
const BUSINESS_PREFIX = "/business";

export function defaultPathAfterLogin(profile: UserProfile | null): string {
  if (canAccessVenuePortal(profile)) return "/venue";
  if (canAccessAdmin(profile)) return "/admin";
  if (!profile?.onboarding_complete) return "/onboarding";
  return "/events";
}

export function routeAccessDenied(
  pathname: string,
  profile: UserProfile | null,
  isAdminByEmail: boolean,
): string | null {
  const effectiveAdmin = isAdminByEmail || profile?.role === "admin" || profile?.is_admin;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!effectiveAdmin || profile?.account_active === false) {
      return `/login?next=${encodeURIComponent(pathname)}`;
    }
    return null;
  }

  if (pathname.startsWith(VENUE_PREFIX)) {
    if (!canAccessVenuePortal(profile)) {
      if (effectiveAdmin) return ADMIN_PREFIX;
      return `/login?next=${encodeURIComponent(pathname)}`;
    }
    return null;
  }

  if (pathname.startsWith(BUSINESS_PREFIX) && isVenueProfile(profile)) {
    const sub = pathname.slice(BUSINESS_PREFIX.length) || "/";
    const mapped = sub === "/" ? "" : sub;
    return `${VENUE_PREFIX}${mapped}`;
  }

  return null;
}
