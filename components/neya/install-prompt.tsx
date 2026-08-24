"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Extend the BeforeInstallPromptEvent type for the deferred prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSAL_KEY = "neya-install-dismissed";
const VISIT_KEY = "neya-page-visits";
const DISMISSAL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Subtle install prompt that only appears after the user has demonstrated
 * meaningful engagement (3+ page visits) and hasn't dismissed it recently.
 * Uses the native beforeinstallprompt event — no fake install buttons.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      // Prevent the default mini-infobar on Android Chrome
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if the user dismissed recently
      const dismissedAt = Number(localStorage.getItem(DISMISSAL_KEY) ?? 0);
      const visits = Number(localStorage.getItem(VISIT_KEY) ?? 0) + 1;
      localStorage.setItem(VISIT_KEY, String(visits));

      const recentlyDismissed = Date.now() - dismissedAt < DISMISSAL_EXPIRY_MS;
      // Only show after 3 visits and if not recently dismissed
      if (visits >= 3 && !recentlyDismissed) {
        setVisible(true);
      }
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    }
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-xl",
        "sm:left-4 sm:right-auto sm:bottom-4 sm:max-w-sm sm:rounded-2xl sm:border",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20">
          <Download className="h-5 w-5 text-fuchsia-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Get the NEYA app</p>
          <p className="text-xs text-white/50">Add to home screen for a faster experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 px-3 py-1.5 text-xs font-bold text-white"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-lg p-1 text-white/40 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
