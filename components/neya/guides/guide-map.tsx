"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GuideStop, GuideTransport } from "@/types/guides";
import {
  GUIDE_STOP_CATEGORIES,
  GUIDE_TRANSPORT_TYPES,
  stopCategoryColor,
} from "@/lib/guides/constants";
import { cn } from "@/lib/utils";

export interface GuideMapMarker extends GuideStop {
  transports?: GuideTransport[];
}

interface GuideMapProps {
  className?: string;
  center?: [number, number];
  stops: GuideMapMarker[];
  showTransport?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPopupHtml(
  stop: GuideMapMarker,
  userLocation?: { lat: number; lng: number } | null,
): string {
  const dist =
    userLocation && stop.latitude != null && stop.longitude != null
      ? `${haversineKm(userLocation.lat, userLocation.lng, stop.latitude, stop.longitude).toFixed(1)} km away`
      : "";
  const visit = stop.estimated_visit_time ? `${stop.estimated_visit_time} min visit` : "";
  const directions =
    stop.latitude != null && stop.longitude != null
      ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}" target="_blank" rel="noopener" style="color:#38bdf8;font-size:12px">Get directions →</a>`
      : "";
  const img = stop.image
    ? `<img src="${stop.image}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
    : "";
  const transport =
    stop.transports?.length ?
      `<div style="margin-top:8px;font-size:11px;color:#a3a3a3">${stop.transports
        .map((t) => {
          const label = GUIDE_TRANSPORT_TYPES.find((x) => x.value === t.transport_type)?.label ?? t.transport_type;
          return `${label}${t.departure_frequency ? ` · ${t.departure_frequency}` : ""}`;
        })
        .join("<br/>")}</div>`
    : "";

  return `<div style="color:#e2e8f0;max-width:220px;font-family:system-ui">
    ${img}
    <strong style="font-size:14px">${stop.name}</strong>
    <p style="font-size:11px;color:#94a3b8;margin:4px 0;text-transform:capitalize">${stop.category.replace(/_/g, " ")}</p>
    ${stop.description ? `<p style="font-size:12px;color:#cbd5e1;margin:4px 0">${stop.description.slice(0, 120)}${stop.description.length > 120 ? "…" : ""}</p>` : ""}
    ${dist ? `<p style="font-size:11px;color:#38bdf8">${dist}</p>` : ""}
    ${visit ? `<p style="font-size:11px;color:#f472b6">${visit}</p>` : ""}
    ${directions}
    ${transport}
  </div>`;
}

export function GuideMap({
  className,
  center = [21.1655, 42.6629],
  stops,
  showTransport = true,
  userLocation = null,
}: GuideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(GUIDE_STOP_CATEGORIES.map((c) => c.value)),
  );

  const categoriesInUse = useMemo(() => {
    const set = new Set(stops.map((s) => s.category));
    return GUIDE_STOP_CATEGORIES.filter((c) => set.has(c.value));
  }, [stops]);

  const filteredStops = useMemo(
    () => stops.filter((s) => activeCategories.has(s.category) && s.latitude != null && s.longitude != null),
    [stops, activeCategories],
  );

  const transportPoints = useMemo(() => {
    if (!showTransport) return [];
    const points: { lat: number; lng: number; label: string; type: string }[] = [];
    for (const stop of filteredStops) {
      for (const t of stop.transports ?? []) {
        if (t.station_latitude != null && t.station_longitude != null) {
          const label = GUIDE_TRANSPORT_TYPES.find((x) => x.value === t.transport_type)?.label ?? t.transport_type;
          points.push({
            lat: t.station_latitude,
            lng: t.station_longitude,
            label: t.station_name ?? t.route_name ?? label,
            type: t.transport_type,
          });
        }
      }
    }
    return points;
  }, [filteredStops, showTransport]);

  const toggleCategory = useCallback((cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 12,
      pitch: 40,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;

    return () => {
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

      for (const stop of filteredStops) {
        if (stop.latitude == null || stop.longitude == null) continue;
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = stopCategoryColor(stop.category);
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";
        el.style.cursor = "pointer";

        const mk = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(
              buildPopupHtml(stop, userLocation),
            ),
          )
          .addTo(map);
        markersRef.current.push(mk);
      }

      for (const tp of transportPoints) {
        const el = document.createElement("div");
        el.style.width = "10px";
        el.style.height = "10px";
        el.style.borderRadius = "2px";
        el.style.backgroundColor = tp.type.includes("bus") ? "#34d399" : "#fbbf24";
        el.style.border = "1px solid white";
        const mk = new mapboxgl.Marker({ element: el })
          .setLngLat([tp.lng, tp.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 10 }).setHTML(
              `<div style="color:#e2e8f0;font-size:12px"><strong>${tp.label}</strong><br/><span style="color:#94a3b8">${tp.type.replace(/_/g, " ")}</span></div>`,
            ),
          )
          .addTo(map);
        markersRef.current.push(mk);
      }

      if (userLocation) {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#f472b6";
        el.style.border = "2px solid white";
        const mk = new mapboxgl.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<span style="color:#e2e8f0;font-size:12px">You are here</span>`))
          .addTo(map);
        markersRef.current.push(mk);
      }

      if (filteredStops.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        filteredStops.forEach((s) => {
          if (s.longitude != null && s.latitude != null) bounds.extend([s.longitude, s.latitude]);
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("load", sync);
      return () => {
        map.off("load", sync);
      };
    }
    sync();
  }, [filteredStops, transportPoints, userLocation]);

  const missingToken = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className={cn("space-y-3", className)}>
      {categoriesInUse.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {categoriesInUse.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleCategory(c.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                activeCategories.has(c.value)
                  ? "text-black"
                  : "border border-white/15 text-white/50",
              )}
              style={activeCategories.has(c.value) ? { backgroundColor: c.color } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
        {missingToken ? (
          <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-950/80 to-black p-6 text-center">
            <p className="text-sm font-medium text-white">Map preview</p>
            <p className="max-w-sm text-xs text-white/55">Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive guide map.</p>
          </div>
        ) : (
          <div ref={containerRef} className="aspect-[16/9] w-full min-h-[280px]" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
      </div>
    </div>
  );
}
