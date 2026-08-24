"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { en, type Dictionary } from "./dictionaries/en";
import { sq } from "./dictionaries/sq";
import { de } from "./dictionaries/de";
import { tr } from "./dictionaries/tr";
import { sr } from "./dictionaries/sr";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * NEYA i18n — lightweight, dependency-free localization on top of the
 * existing React stack. English is the default; Albanian, German and
 * Turkish are fully supported.
 *
 * Persistence: the selected locale is written to a cookie (`neya_locale`)
 * so it survives navigation and refreshes and can be read server-side
 * (e.g. for `<html lang>` in the root layout).
 */
const dictionaries: Record<Locale, Dictionary> = {
  en,
  sq,
  de,
  tr,
  sr,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1] ?? "";
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function I18nProvider({ initialLocale, children }: { initialLocale?: Locale; children: React.ReactNode }) {
  // Server locales arrive via the `initialLocale` prop (root layout reads
  // the cookie for SSR, so server + first client render agree — no
  // hydration mismatch or locale flash). Without a prop (e.g. an embed or
  // test harness) fall back to the persisted cookie, then the default.
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readLocaleCookie());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Keep `<html lang>` in sync immediately (the server-cached layout
    // attribute catches up on the next full page load).
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

/** Convenience alias matching the common `useTranslation` naming. */
export function useTranslation() {
  return useI18n();
}