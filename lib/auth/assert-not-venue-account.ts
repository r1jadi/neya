import { redirect } from "next/navigation";
import { getProfileForUserId } from "@/lib/auth/profile";
import { isVenueProfile } from "@/lib/auth/permissions";

/** Venue partner accounts are admin-provisioned — block legacy self-service business flows. */
export async function assertNotVenueAccount(userId: string, fallback = "/venue") {
  const profile = await getProfileForUserId(userId);
  if (isVenueProfile(profile)) redirect(fallback);
}
