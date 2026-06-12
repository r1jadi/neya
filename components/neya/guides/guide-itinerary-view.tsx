"use client";

import { useState } from "react";
import Image from "next/image";
import { Bus, Clock, MapPin } from "lucide-react";
import type { Guide, GuideDay } from "@/types/guides";
import { GUIDE_TRANSPORT_TYPES } from "@/lib/guides/constants";
import { GuideMap } from "@/components/neya/guides/guide-map";
import { cn } from "@/lib/utils";

interface GuideItineraryViewProps {
  guide: Guide;
  className?: string;
}

export function GuideItineraryView({ guide, className }: GuideItineraryViewProps) {
  const days = guide.days ?? [];
  const [activeDay, setActiveDay] = useState(days[0]?.day_number ?? 1);

  const currentDay = days.find((d) => d.day_number === activeDay) ?? days[0];
  const allStops = days.flatMap((d) => d.stops ?? []);

  return (
    <div className={cn("space-y-8", className)}>
      {days.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDay(d.day_number)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                activeDay === d.day_number
                  ? "bg-white text-black"
                  : "border border-white/15 text-white/70 hover:text-white",
              )}
            >
              Day {d.day_number}
            </button>
          ))}
        </div>
      ) : null}

      <GuideMap stops={allStops} showTransport />

      {currentDay ? <DaySection day={currentDay} /> : null}
    </div>
  );
}

function DaySection({ day }: { day: GuideDay }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">
          Day {day.day_number}
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">{day.title || `Day ${day.day_number}`}</h2>
        {day.description ? <p className="mt-2 text-sm text-white/55">{day.description}</p> : null}
      </div>

      <ol className="space-y-4">
        {(day.stops ?? []).map((stop, i) => (
          <li
            key={stop.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
          >
            <div className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{stop.name}</h3>
                  <p className="mt-0.5 text-xs capitalize text-white/45">{stop.category.replace(/_/g, " ")}</p>
                </div>
                {stop.image ? (
                  <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-xl">
                    <Image src={stop.image} alt="" fill className="object-cover" sizes="400px" />
                  </div>
                ) : null}
                {stop.description ? <p className="text-sm text-white/60">{stop.description}</p> : null}
                <div className="flex flex-wrap gap-3 text-xs text-white/50">
                  {stop.latitude != null && stop.longitude != null ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-sky-400" />
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </span>
                  ) : null}
                  {stop.estimated_visit_time ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-fuchsia-400" />
                      {stop.estimated_visit_time} min
                    </span>
                  ) : null}
                </div>
                {(stop.transports ?? []).length > 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                      <Bus className="h-3.5 w-3.5" />
                      Transport
                    </p>
                    <ul className="mt-2 space-y-2">
                      {stop.transports!.map((t) => {
                        const label =
                          GUIDE_TRANSPORT_TYPES.find((x) => x.value === t.transport_type)?.label ??
                          t.transport_type;
                        return (
                          <li key={t.id} className="text-sm text-white/70">
                            <strong className="text-white">{label}</strong>
                            {t.route_name ? ` — ${t.route_name}` : ""}
                            {t.station_name ? ` · ${t.station_name}` : ""}
                            {t.departure_frequency ? (
                              <span className="block text-xs text-white/45">{t.departure_frequency}</span>
                            ) : null}
                            {t.notes ? <span className="block text-xs text-white/45">{t.notes}</span> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <NearbyEventsPanel stopId={stop.id} lat={stop.latitude} lng={stop.longitude} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NearbyEventsPanel({
  lat,
  lng,
}: {
  stopId: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const [events, setEvents] = useState<{ slug: string; title: string; starts_at: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (lat == null || lng == null) return null;

  if (!loaded) {
    fetch(`/api/guides/nearby-events?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return null;
  }

  if (!events.length) return null;

  return (
    <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300/90">
        Events near this location
      </p>
      <ul className="mt-2 space-y-1">
        {events.map((e) => (
          <li key={e.slug}>
            <a href={`/events/${e.slug}`} className="text-sm text-sky-300 hover:underline">
              {e.title}
            </a>
            <span className="ml-2 text-xs text-white/40">
              {new Date(e.starts_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
