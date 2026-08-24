import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string) {
  return UUID_RE.test(id);
}

/**
 * NEYA primary call-to-action gradient — the canonical "do the main thing"
 * button look (sky→fuchsia gradient, near-black text). Centralized so every
 * primary CTA stays visually identical instead of drifting across copies.
 * Pair with rounded-xl/border-none and appropriate padding/typography.
 */
export const neyaPrimaryGradient =
  "bg-gradient-to-r from-sky-400 to-fuchsia-500 text-zinc-950 hover:opacity-95";

/**
 * NEYA secondary "buy/reserve" gradient — used for external ticket links and
 * the ticket-card pay button (violet→fuchsia, white text).
 */
export const neyaSecondaryGradient =
  "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-95";
