import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { sq } from "./dictionaries/sq";
import { de } from "./dictionaries/de";
import { tr } from "./dictionaries/tr";
import { sr } from "./dictionaries/sr";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { en, sq, de, tr, sr };

/** Read the persisted locale in a server component (root layout). */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server-side dictionary for the persisted locale (server components). */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}