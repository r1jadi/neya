/** Supported locales for NEYA. English is the default (fallback). */
export const LOCALES = ["en", "sq", "de", "tr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  sq: "Shqip",
  de: "Deutsch",
  tr: "Türkçe",
};

/** Cookie name — read by the server (layout) and the client (provider). */
export const LOCALE_COOKIE = "neya_locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "sq" || value === "de" || value === "tr";
}