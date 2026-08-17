"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatedMap } from "@/components/neya/animated-map";
import { EventCard } from "@/components/neya/event-card";
import { thisWeekend, tonightEvents } from "@/lib/event-filters";
import { isTonight } from "@/lib/event-dates";
import type { Event } from "@/types";

type Collection = { id: string; title: string; note: string; events: Event[] };

/**
 * Living editorial rails derived from the same verified events NEYA sells,
 * reserves and adds to My Night. No empty rail is rendered.
 */
export function EditorialEventGuides({ events, savedEventIds, nowIso }: { events: Event[]; savedEventIds: string[]; nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const collections = useMemo<Collection[]>(() => {
    const week = events.filter((event) => new Date(event.starts_at).getTime() <= now.getTime() + 7 * 86400000);
    return [
      { id: "tonight", title: "Best events tonight", note: "A live, time-ordered plan for tonight.", events: tonightEvents(events, now).slice(0, 6) },
      { id: "weekend", title: "This weekend", note: "Verified plans from Friday through Sunday.", events: thisWeekend(events, now).slice(0, 8) },
      { id: "electronic", title: "Electronic music weekend", note: "House, techno and electronic nights in the current programme.", events: thisWeekend(events, now).filter((event) => ["house", "deep_house", "tech_house", "techno", "melodic_techno", "hard_techno", "edm", "electro", "drum_and_bass"].includes(event.genre)).slice(0, 8) },
      { id: "free", title: "Free things to do", note: "Only events marked free by their publisher.", events: events.filter((event) => event.is_free).slice(0, 8) },
      { id: "live-music", title: "Live music this week", note: "Concert and live-music picks over the next seven days.", events: week.filter((event) => event.category === "concert" || event.category === "live_music" || event.genre === "live_music").slice(0, 8) },
    ].filter((collection) => collection.events.length > 0);
  }, [events, now]);
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? "");
  const selected = collections.find((collection) => collection.id === selectedId) ?? collections[0];
  if (!selected) return null;
  const markers = selected.events.flatMap((event) => event.venue?.lat != null && event.venue.lng != null ? [{ lat: event.venue.lat, lng: event.venue.lng, slug: event.venue.slug, title: event.venue.name, is_live: event.live_status && isTonight(event.starts_at, now) }] : []);
  const center: [number, number] = markers[0] ? [markers[0].lng, markers[0].lat] : [21.1655, 42.6629];
  return <section className="mt-14"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">NEYA picks</p><h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-white">Plan the night, not just the event</h2><p className="mt-2 max-w-2xl text-sm text-white/55">Every pick is sourced from the live NEYA programme. Add any event to My Night to make it your own.</p></div><Link href="/my-night" className="text-sm text-sky-300 hover:underline">Open My Night →</Link></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{collections.map((collection) => <button key={collection.id} type="button" onClick={() => setSelectedId(collection.id)} className={selected.id === collection.id ? "whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black" : "whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"}>{collection.title}</button>)}</div><p className="mt-4 text-sm text-white/55">{selected.note} Recommended order: earliest start first.</p>{markers.length ? <AnimatedMap className="mt-5" center={center} markers={markers} /> : null}<div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{selected.events.map((event) => <EventCard key={event.id} event={event} saved={savedEventIds.includes(event.id)} />)}</div></section>;
}
