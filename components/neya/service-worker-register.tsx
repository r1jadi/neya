"use client";

import { useEffect } from "react";

/**
 * Registers the NEYA service worker for static-asset caching.
 * Only runs in production — dev assets change too frequently to cache.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // SW registration failure is non-critical — the site works without it.
      });
  }, []);

  return null;
}
