"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Present the entry code (neya:…) so a user can actually use it at the door —
 * prominent, truncatable, and one tap to copy.
 */
export function TicketCode({ payload, className }: { payload: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context) — the
      // code stays visible and selectable, so the user can still use it.
    }
  }

  return (
    <div
      className={cn(
        "mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">
          Entry code — show at the door
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-emerald-100" title={payload}>
          {payload}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          copied
            ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
        )}
        aria-label="Copy entry code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
