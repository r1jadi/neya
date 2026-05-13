export const DEFAULT_CITY = {
  slug: "prishtina",
  name: "Prishtina",
  country: "Kosovo",
} as const;

export const SITE = {
  name: "NEYA",
  tagline: "What's happening tonight?",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://neya.app",
} as const;
