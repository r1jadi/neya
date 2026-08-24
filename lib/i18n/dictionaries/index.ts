import { en, type Dictionary } from "./en";
import { sq } from "./sq";
import { de } from "./de";
import { tr } from "./tr";
import type { Locale } from "../config";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  sq,
  de,
  tr,
};

/** Pick the dictionary for a locale (server + client safe). */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}