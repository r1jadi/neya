"use client";

import { useEffect, useRef } from "react";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";

export function DiscoveryTracker({ metric, eventId, venueId, dimensions }: { metric: string; eventId?: string; venueId?: string; dimensions?: Record<string, string | number | boolean | null> }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackDiscoveryMetric(metric, { eventId, venueId, dimensions });
  }, [metric, eventId, venueId, dimensions]);
  return null;
}
