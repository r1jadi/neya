"use client";

import { useI18n } from "@/lib/i18n";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT_LABELS } from "@/lib/i18n/config";
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
        "inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        const name = LOCALE_LABELS[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={name}
            title={name}
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold tracking-wide transition",
              active
                ? "bg-gradient-to-r from-sky-400 to-fuchsia-400 text-[#09090b]"
                : "text-white/60 hover:text-white",
            )}
          >
            {LOCALE_SHORT_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}