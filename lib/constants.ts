import { getPublicSiteUrl } from "@/lib/env";

export const DEFAULT_CITY = {
  slug: "prishtina",
  name: "Prishtina",
  country: "Kosovo",
} as const;

export const SITE = {
  name: "NEYA",
  tagline: "What's happening tonight?",
  get url() {
    return getPublicSiteUrl();
  },
};
