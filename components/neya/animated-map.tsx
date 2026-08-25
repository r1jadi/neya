"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";

export interface MapMarker {
  lng: number;
  lat: number;
  slug: string;
  title: string;
  is_live?: boolean;
  kind?: "event" | "venue";
  href?: string;
  /** Venue category id ("rooftop", "nightclub"…) — drives the marker glyph. */
  category?: string;
  /** Real crowd count when non-zero. */
  crowd_count?: number;
  /** Real atmosphere rating (0–10) when present. */
  atmosphere_rating?: number;
}

interface AnimatedMapProps {
  className?: string;
  center?: [number, number];
  markers?: MapMarker[];
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  /** Called when a marker is tapped — the parent decides what to show (preview card, never an immediate page jump). */
  onSelectMarker?: (marker: MapMarker) => void;
  /** `kind:slug` of the currently selected marker (highlighted on the map). */
  selectedKey?: string | null;
  /** Fly the map to a point (e.g. user location). */
  flyTo?: { lat: number; lng: number; nonce: number } | null;
}

const EVENT_GLYPH: Record<string, string> = {
  dj_set: "🎧",
  nightlife: "🎵",
  concert: "🎤",
  live_music: "🎤",
  festival: "🎉",
  culture: "🎭",
  theatre: "🎭",
  comedy: "🎙️",
  sports: "🎪",
  food_drink: "🍹",
  outdoor: "🌿",
  family: "🎈",
  community: "🤝",
  workshop: "🧰",
  wellness: "🧘",
  other: "✨",
};

const VENUE_GLYPH: Record<string, string> = {
  rooftop: "🌅",
  bar: "🍸",
  cafe: "☕",
  pub: "🍺",
  jazz_club: "🎶",
  live_music: "🎤",
  festival: "🎉",
  festival_ground: "🎉",
  nightclub: "🪩",
  club: "🪩",
  clubbing_venue: "🪩",
  underground_venue: "🪩",
  open_air_venue: "🌿",
  park: "🌿",
  outdoor_space: "🌿",
  pool_club: "🏖️",
  beach_club: "🏖️",
  wine_bar: "🥂",
  cocktail_bar: "🥂",
  restaurant: "🍽️",
  food_hall: "🍽️",
  cinema: "🎭",
  theater: "🎭",
  arena: "🏟️",
  stadium: "🏟️",
  sports_venue: "🏟️",
};

const DEFAULT_VENUE_GLYPH = "✨";

function glyphFor(marker: MapMarker): string {
  if (marker.kind === "event") return EVENT_GLYPH[marker.category ?? "nightlife"] ?? "🎵";
  return VENUE_GLYPH[marker.category ?? ""] ?? DEFAULT_VENUE_GLYPH;
}

/** Marks that share a grid cell at the current zoom get merged into one cluster. */
function clusterMarkers(items: MapMarker[], zoom: number): (MapMarker & { clusterCount?: number })[] {
  const cell = 0.008 * Math.pow(2, 13 - Math.min(16, Math.max(8, zoom)));
  const groups = new Map<string, MapMarker[]>();
  for (const marker of items) {
    const key = `${Math.round(marker.lng / cell)}:${Math.round(marker.lat / cell)}`;
    const group = groups.get(key) ?? [];
    group.push(marker);
    groups.set(key, group);
  }
  const out: (MapMarker & { clusterCount?: number })[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
    } else {
      const lat = group.reduce((a, m) => a + m.lat, 0) / group.length;
      const lng = group.reduce((a, m) => a + m.lng, 0) / group.length;
      out.push({
        lat,
        lng,
        slug: `cluster-${lat}-${lng}`,
        title: `${group.length} places`,
        clusterCount: group.length,
      });
    }
  }
  return out;
}

/** Dark nightlife map — requires NEXT_PUBLIC_MAPBOX_TOKEN */
export function AnimatedMap({
  className,
  center = [21.1655, 42.6629],
  markers = [],
  onBoundsChange,
  onSelectMarker,
  selectedKey,
  flyTo,
}: AnimatedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ remove: () => void }[]>([]);
  const callbacksRef = useRef({ onBoundsChange, onSelectMarker });
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  /** Initial camera position — captured once. The map instance must never be
   * re-created when the parent re-renders (see lifecycle effect below). */
  const initialCenterRef = useRef(center);

  useEffect(() => {
    callbacksRef.current = { onBoundsChange, onSelectMarker };
  }, [onBoundsChange, onSelectMarker]);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  // Swap the Mapbox style when the theme changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(themeRef.current === "light" ? LIGHT_STYLE : DARK_STYLE);
  }, [resolvedTheme]);

  // Map lifecycle — create ONCE on mount.
  // Do NOT depend on `center`: parents frequently pass an inline array literal
  // (e.g. <AnimatedMap center={[21.16, 42.66]} … />), so it changes identity on
  // every render. Depending on it made this effect tear down and re-create the
  // whole Mapbox instance on any parent state change (typing a filter, or even
  // panning -> moveend -> setBounds), which reset the camera and reloaded tiles.
  // Programmatic camera moves go through `flyTo` instead.
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: themeRef.current === "light" ? LIGHT_STYLE : DARK_STYLE,
      center: initialCenterRef.current,
      zoom: 12.2,
      pitch: 45,
      antialias: true,
      maxPitch: 60,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    const report = () => {
      const bounds = map.getBounds();
      if (bounds) callbacksRef.current.onBoundsChange?.({ west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() });
    };
    map.on("moveend", report);
    map.on("zoomend", report);
    map.on("load", report);
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly-to (geolocation / selected-day pills)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: Math.max(map.getZoom(), 14.5), essential: true, duration: 1400 });
  }, [flyTo]);

  // Markers + clustering + selection rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (!markers.length) return;

      const zoom = map.getZoom();
      const resolved = clusterMarkers(markers, zoom);

      for (const item of resolved) {
        const isCluster = typeof item.clusterCount === "number";
        const isSelected = selectedKey != null && !isCluster && `${item.kind}:${item.slug}` === selectedKey;
        const isLive = !isCluster && Boolean(item.is_live);
        const glyph = isCluster ? null : elementFor(item);

        const el = document.createElement("button");
        el.type = "button";
        const base = "group/pin relative flex cursor-pointer items-center justify-center rounded-full border transition-transform duration-200 focus:outline-none";
        const size = isCluster ? "h-10 w-10" : isLive || isSelected ? "h-9 w-9" : "h-8 w-8";
        el.className = cn(
          base,
          size,
          isCluster
            ? "border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-[0_4px_18px_rgba(217,70,239,0.45)]"
            : isLive
              ? "border-emerald-300/50 bg-emerald-500/90 shadow-[0_4px_18px_rgba(16,185,129,0.45)]"
              : "border-white/25 bg-zinc-900/95 shadow-[0_3px_14px_rgba(0,0,0,0.6)]",
          isSelected && "scale-110 ring-4 ring-fuchsia-400/70",
        );
        el.style.color = isCluster || isLive ? "#030306" : themeRef.current === "light" ? "#1b1b22" : "#fff";
        el.style.fontSize = isCluster ? "12px" : "13px";
        if (isLive) el.style.animation = "neya-pin-pulse 2s ease-in-out infinite";
        el.innerHTML = isCluster ? String(item.clusterCount) : isLive ? "🔴" : (glyph ?? "✨");
        el.setAttribute("aria-label", item.title);
        el.title = item.title;

        if (!isCluster) {
          const label = document.createElement("span");
          label.className =
            "pointer-events-none absolute -bottom-5 left-1/2 max-w-[110px] -translate-x-1/2 truncate rounded-full bg-black/80 px-2 py-0.5 text-center text-[10px] font-semibold text-white/90 backdrop-blur-sm";
          label.textContent = item.title;
          label.style.whiteSpace = "nowrap";
          if (isSelected || isLive) label.className += " ring-1 ring-fuchsia-400/40";
          el.appendChild(label);
        }

        if (!isCluster && item.atmosphere_rating != null && item.atmosphere_rating >= 6.5) {
          const vibe = document.createElement("span");
          vibe.className =
            "pointer-events-none absolute -right-2 -top-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-950 shadow";
          vibe.textContent = `🔥${item.atmosphere_rating.toFixed(1)}`;
          el.appendChild(vibe);
        }

        if (isLive && item.crowd_count && item.crowd_count > 0) {
          const crowd = document.createElement("span");
          crowd.className =
            "pointer-events-none absolute -bottom-1 -right-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-zinc-950 shadow";
          crowd.textContent = `${item.crowd_count}`;
          el.appendChild(crowd);
        }

        el.addEventListener("click", () => {
          if (isCluster) {
            map.easeTo({ center: [item.lng, item.lat], zoom: Math.min(16, zoom + 1.6), duration: 600 });
            return;
          }
          callbacksRef.current.onSelectMarker?.(item);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: isCluster ? "center" : "top" })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markersRef.current.push({ remove: () => marker.remove() });
      }
    };

    render();
    map.on("moveend", render);
    map.on("zoomend", render);
    return () => {
      map.off("moveend", render);
      map.off("zoomend", render);
    };
  }, [markers, selectedKey, resolvedTheme]);

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
        <div ref={containerRef} className="h-[52vh] w-full min-h-[380px] md:h-[560px]" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}

function elementFor(marker: MapMarker): string | null {
  return glyphFor(marker);
}