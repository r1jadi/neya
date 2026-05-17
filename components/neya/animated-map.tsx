"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

export interface MapMarker {
  lng: number;
  lat: number;
  slug: string;
  title: string;
  is_live?: boolean;
}

interface AnimatedMapProps {
  className?: string;
  center?: [number, number];
  markers?: MapMarker[];
}

/** Dark nightlife map — requires NEXT_PUBLIC_MAPBOX_TOKEN */
export function AnimatedMap({ className, center = [21.1655, 42.6629], markers = [] }: AnimatedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

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
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      for (const p of markers) {
        if (p.lat == null || p.lng == null || Number.isNaN(p.lat) || Number.isNaN(p.lng)) continue;
        const color = p.is_live ? "#f472b6" : "#38bdf8";
        const mk = new mapboxgl.Marker({ color })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14 }).setHTML(
              `<a href="/venues/${p.slug}" style="color:#e2e8f0;font-weight:600">${p.title}</a>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(mk);
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("load", sync);
      return () => {
        map.off("load", sync);
      };
    }
    sync();
    return undefined;
  }, [markers]);

  const missingToken = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950", className)}>
      {missingToken ? (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-950/80 to-black p-6 text-center">
          <p className="text-sm font-medium text-white">Map preview</p>
          <p className="max-w-sm text-xs text-white/55">
            The live city map is coming soon. Browse venues and events below in the meantime.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="aspect-[16/9] w-full min-h-[280px]" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
