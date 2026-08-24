"use client";

import { Footprints } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TravelStop {
  lat: number;
  lng: number;
}

interface NightTravelHintsProps {
  from: TravelStop;
  to: TravelStop;
}

/**
 * Real walking duration between two consecutive stops, from the Mapbox walking
 * directions API. Renders nothing until the API returns — never fabricated.
 */
export function NightTravelHints({ from, to }: NightTravelHintsProps) {
  const token = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined;
  const [leg, setLeg] = useState<{ durationMin: number; distanceM: number } | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng) || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) {
      return;
    }
    const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const fetchId = ++fetchIdRef.current;
    let cancelled = false;
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?overview=false&steps=false&access_token=${token}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || fetchId !== fetchIdRef.current) return;
        const route = data?.routes?.[0];
        const routeLeg = route?.legs?.[0] as { duration?: number; distance?: number } | undefined;
        if (!routeLeg) return;
        setLeg({
          durationMin: Math.max(1, Math.round((routeLeg.duration ?? 0) / 60)),
          distanceM: Math.round(routeLeg.distance ?? 0),
        });
      })
      .catch(() => {
        // Route unavailable (no token / offline) — the hint simply doesn't render.
      });
    return () => {
      cancelled = true;
    };
  }, [from.lat, from.lng, to.lat, to.lng, token]);

  if (!leg) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-1 text-xs text-white/45">
      <span className="h-6 w-px bg-gradient-to-b from-white/20 to-white/5" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
        <Footprints className="h-3.5 w-3.5 text-sky-300" />
        ~{leg.durationMin} min walk
        {leg.distanceM >= 100 ? ` · ${(leg.distanceM / 1000).toFixed(1)} km` : ` · ${leg.distanceM} m`}
      </span>
      <span className="h-6 w-px bg-gradient-to-b from-white/20 to-white/5" />
    </div>
  );
}