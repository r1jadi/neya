"use client";

import { useSyncExternalStore, useState } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // server assumes online
}

/**
 * Shows a small banner at the top when the browser is offline.
 * Does not cache private data — just informs the user.
 * Uses useSyncExternalStore to avoid hydration mismatches and
 * the react-hooks/purity lint rule.
 */
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 border-b border-amber-500/30 bg-amber-950/95 px-4 py-2.5 text-center backdrop-blur-xl">
      <p className="inline-flex items-center gap-2 text-sm text-amber-100">
        <WifiOff className="h-4 w-4" />
        You&apos;re offline — some NEYA features aren&apos;t available right now.
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 text-amber-300 hover:text-amber-100"
          aria-label="Dismiss offline banner"
        >
          ×
        </button>
      </p>
    </div>
  );
}
