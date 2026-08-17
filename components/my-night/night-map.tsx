"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

export interface NightMapStop {
  index: number;
  title: string;
  lat: number;
  lng: number;
}

interface NightMapProps {
  stops: NightMapStop[];
  className?: string;
}

/** Dark nightlife map with numbered markers + route — requires NEXT_PUBLIC_MAPBOX_TOKEN. */
export function NightMap({ stops, className }: NightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeRef = useRef<{ source: string; layer: string } | null>(null);
  const fetchIdRef = useRef(0);
  const [token] = useState(() => process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  // Create the map once.
  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const withCoords = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    const first = withCoords[0];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: first ? [first.lng, first.lat] : [21.1655, 42.6629],
      zoom: 12.5,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      fetchIdRef.current += 1;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  // Markers + fit bounds + route (re-runs on reorder).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (routeRef.current) {
        try {
          map.removeLayer(routeRef.current.layer);
          map.removeSource(routeRef.current.source);
        } catch {
          // Already removed.
        }
        routeRef.current = null;
      }

      const withCoords = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
      if (!withCoords.length) return;

      const bounds = new mapboxgl.LngLatBounds();
      for (const stop of withCoords) {
        bounds.extend([stop.lng, stop.lat]);
        const el = document.createElement("div");
        el.className = "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-black";
        el.style.background = "#f472b6";
        el.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.55)";
        el.textContent = String(stop.index + 1);
        markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map));
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 700 });
      }

      // Route in visit order (user decides the order — never auto-optimized).
      if (withCoords.length >= 2) {
        const coordinates = withCoords.map((s) => `${s.lng},${s.lat}`).join(";");
        const fetchId = ++fetchIdRef.current;
        fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${token}`,
        )
          .then((res) => res.json())
          .then((data) => {
            if (fetchId !== fetchIdRef.current || !mapRef.current) return;
            const route = data?.routes?.[0];
            if (!route) return;
            map.addSource("night-route", {
              type: "geojson",
              data: { type: "Feature", properties: {}, geometry: route.geometry },
            });
            map.addLayer({
              id: "night-route",
              type: "line",
              source: "night-route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": "#f472b6", "line-width": 4, "line-opacity": 0.85 },
            });
            routeRef.current = { source: "night-route", layer: "night-route" };
          })
          .catch(() => {
            // Route unavailable (e.g. no token) — markers still show.
          });
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
  }, [stops, token]);

  const missingToken = !token;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950", className)}>
      {missingToken ? (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-950/80 to-black p-6 text-center">
          <p className="text-sm font-medium text-white">Route preview</p>
          <p className="max-w-sm text-xs text-white/55">
            Add two or more stops and the order you&apos;ll visit them appears here.
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="aspect-[16/9] w-full min-h-[260px]" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
