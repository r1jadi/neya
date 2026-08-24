"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Sun/Moon toggle for the Light theme. Persists via `next-themes`
 * (localStorage, applied pre-paint by its inline script), so the choice
 * survives navigation and refreshes with no flash of the wrong theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  const { t } = useI18n();

  // Read the active theme straight from <html> — set pre-paint by
  // next-themes, SSR-safe, and instantly correct on first render.
  const isLight =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light");

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? t.common.darkTheme : t.common.lightTheme}
      title={isLight ? t.common.darkTheme : t.common.lightTheme}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/20 hover:text-white",
        className,
      )}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}