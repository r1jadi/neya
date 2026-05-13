"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

interface AnimatedMapProps {
  className?: string;
  center?: [number, number];
}

/** Dark nightlife map — requires NEXT_PUBLIC_MAPBOX_TOKEN */
export function AnimatedMap({
  className,
  center = [21.1655, 42.6629], // Prishtina
}: AnimatedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 12.2,
      pitch: 45,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    const pulse = window.setInterval(() => {
      map.easeTo({ pitch: map.getPitch() === 45 ? 52 : 45, duration: 4000, easing: (t) => t });
    }, 8000);

    return () => {
      window.clearInterval(pulse);
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  const missingToken = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950", className)}>
      {missingToken ? (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-950/80 to-black p-6 text-center">
          <p className="text-sm font-medium text-white">Map preview</p>
          <p className="max-w-sm text-xs text-white/55">
            Add <code className="rounded bg-white/10 px-1 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the
            live Mapbox canvas.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="aspect-[16/9] w-full min-h-[280px]" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
