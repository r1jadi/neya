"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NeoTheme = "dark" | "light" | "neobrutal";

const NEXT_THEME: Record<NeoTheme, NeoTheme> = {
  dark: "light",
  light: "neobrutal",
  neobrutal: "dark",
};

/**
 * Cycles through three themes — Default (dark), Light and Neo-Brutalist.
 * Persists via `next-themes` (localStorage, applied pre-paint), so the
 * choice survives navigation and refreshes with no flash of the wrong theme.
 * Uses `resolvedTheme` reactively so the button always reflects the current
 * theme and updates immediately on click.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  // The persisted theme is only known after mount (next-themes applies it
  // pre-paint). Until then render a stable placeholder so the server HTML
  // and the first client render match exactly — no hydration errors on
  // hard reloads with a persisted non-default theme.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const current: NeoTheme =
    resolvedTheme === "light" ? "light" : resolvedTheme === "neobrutal" ? "neobrutal" : "dark";
  const next = NEXT_THEME[current];

  const label = !mounted
    ? t.common.theme
    : next === "light"
      ? t.common.lightTheme
      : next === "neobrutal"
        ? t.common.neoTheme
        : t.common.darkTheme;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:text-white",
        className,
      )}
    >
      {!mounted ? (
        <Sun className="h-4 w-4" />
      ) : current === "light" ? (
        <Moon className="h-4 w-4" />
      ) : current === "neobrutal" ? (
        <Palette className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}