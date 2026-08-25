import { getPublicSiteUrl } from "@/lib/env";

export const DEFAULT_CITY = {
  slug: "prishtina",
  name: "Prishtina",
  country: "Kosovo",
} as const;

/** Max image upload size for admin CMS (must match next.config serverActions.bodySizeLimit). */
export const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Monthly NEYA Places listing fee, in integer cents. */
export const LISTING_FEE_CENTS = 990;

/** How many days one listing fee payment covers. */
export const LISTING_FEE_DAYS = 30;

export const SITE = {
  name: "NEYA",
  tagline: "What's happening tonight?",
  get url() {
    return getPublicSiteUrl();
  },
};
