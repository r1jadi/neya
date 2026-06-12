import { getPublicSiteUrl } from "@/lib/env";

export const DEFAULT_CITY = {
  slug: "prishtina",
  name: "Prishtina",
  country: "Kosovo",
} as const;

/** Max image upload size for admin CMS (must match next.config serverActions.bodySizeLimit). */
export const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024;

export const SITE = {
  name: "NEYA",
  tagline: "What's happening tonight?",
  get url() {
    return getPublicSiteUrl();
  },
};
