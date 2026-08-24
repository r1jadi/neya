"use client";

import { Link2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Shared title/text (event or venue name). */
  title: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: "ghost" | "solid";
  /** Link target kind, for the discovery analytics event. Currently unused but kept for API stability. */
  kind?: "event" | "venue";
}

/** Share via the native share sheet when available, otherwise copy the link. */
export function ShareButton({
  title,
  text,
  url,
  className,
  variant = "ghost",
  // Reserved for future discovery analytics; intentionally unused for now.
  kind: _kind = "event",
}: ShareButtonProps) {
  void _kind;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const target = url ?? (typeof window !== "undefined" ? window.location.href : "");

  function feedback() {
    setCopied(true);
    setError(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: target });
        feedback();
        return;
      }
      await navigator.clipboard.writeText(target);
      feedback();
    } catch (err) {
      // AbortError = user dismissed the sheet — not a failure worth showing.
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(target);
        feedback();
      } catch {
        setError(true);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : `Share ${title}`}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
        variant === "solid"
          ? "border-white/15 bg-white/10 text-white backdrop-blur hover:border-sky-400/40 hover:bg-white/15"
          : "border-white/15 text-white/75 hover:border-sky-400/40 hover:text-white",
        className,
      )}
    >
      {copied ? (
        <>
          <Link2 className="h-4 w-4 text-emerald-300" />
          <span className="text-emerald-200">Link copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span>{error ? "Couldn’t share" : "Share"}</span>
        </>
      )}
    </button>
  );
}
