"use client";

import { useI18n } from "@/lib/i18n";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Compact EN/SQ/DE/TR toggle. Rendered in the header; writes the choice to
 * the `neya_locale` cookie so it persists across navigation and refreshes.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition",
              active
                ? "bg-gradient-to-r from-sky-400 to-fuchsia-400 text-[#09090b]"
                : "text-white/60 hover:text-white",
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}