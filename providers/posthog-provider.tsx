"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

export function PostHogAnalytics({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!key || initRef.current) return;
    initRef.current = true;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
    setReady(true);
  }, [key]);

  if (!key) return children;
  if (!ready) return children;

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
