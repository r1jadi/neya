"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/neya/event-card";
import { EmptyState } from "@/components/neya/empty-state";
import { EVENT_CATEGORIES, eventMatchesQuery } from "@/lib/discovery";
import { CITY_TZ, isTonight } from "@/lib/event-dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";

type Props = { events: Event[]; savedEventIds: string[]; city: string };
const windowOptions = [["all", "All upcoming"], ["tonight", "Tonight"], ["tomorrow", "Tomorrow"], ["week", "This week"], ["weekend", "This weekend"], ["next-week", "Next week"]] as const;
function ymd(iso: string) { return new Date(iso).toLocaleDateString("en-CA", { timeZone: CITY_TZ }); }
function addDays(date: string, count: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + count); return value.toLocaleDateString("en-CA"); }
function weekBounds(today: string, offset = 0) { const value = new Date(`${today}T12:00:00`); const day = value.getDay() || 7; return [addDays(today, 1 - day + offset * 7), addDays(today, 7 - day + offset * 7)] as const; }
function useDebouncedValue(value: string, delay = 180) { const [debounced, setDebounced] = useState(value); useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]); return debounced; }

export function DiscoveryEventBrowser({ events, savedEventIds, city }: Props) {
  const [query, setQuery] = useState(""); const debouncedQuery = useDebouncedValue(query); const [window, setWindow] = useState("all"); const [category, setCategory] = useState(""); const [genre, setGenre] = useState(""); const [venue, setVenue] = useState(""); const [date, setDate] = useState(""); const [access, setAccess] = useState("all"); const [price, setPrice] = useState("all"); const [showFilters, setShowFilters] = useState(false);
  const genres = useMemo(() => [...new Set(events.map((event) => event.genre).filter(Boolean))].sort(), [events]);
  const venues = useMemo(() => [...new Map(events.filter((event) => event.venue).map((event) => [event.venue!.id, event.venue!])).values()].sort((a, b) => a.name.localeCompare(b.name)), [events]);
  const filtered = useMemo(() => events.filter((event) => {
    const eventDate = ymd(event.starts_at); const today = ymd(new Date().toISOString());
    if (date && eventDate !== date) return false;
    if (window === "tonight" && !isTonight(event.starts_at)) return false;
    if (window === "tomorrow" && eventDate !== addDays(today, 1)) return false;
    if (window === "week" || window === "next-week") { const [start, end] = weekBounds(today, window === "next-week" ? 1 : 0); if (eventDate < start || eventDate > end) return false; }
    if (window === "weekend") { const start = addDays(today, (5 - new Date(`${today}T12:00:00`).getDay() + 7) % 7); const end = addDays(start, 2); if (eventDate < start || eventDate > end) return false; }
    if (category && event.category !== category) return false;
    if (genre && event.genre !== genre) return false;
    if (venue && event.venue?.id !== venue) return false;
    if (access === "free" && !event.is_free) return false;
    if (access === "ticketed" && event.is_free) return false;
    if (access === "reservations" && event.reservation_spots_left == null) return false;
    if (price !== "all" && event.ticket_from_eur == null) return false;
    if (price === "under-10" && event.ticket_from_eur! >= 10) return false;
    if (price === "10-25" && (event.ticket_from_eur! < 10 || event.ticket_from_eur! > 25)) return false;
    if (price === "25-plus" && event.ticket_from_eur! < 25) return false;
    return eventMatchesQuery(event, debouncedQuery);
  }), [events, debouncedQuery, window, category, genre, venue, date, access, price]);
  return <div className="mt-8"><div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" /><span className="sr-only">Search events</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${city} events, venues, artists…`} className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/35" /></label><button type="button" onClick={() => setShowFilters((open) => !open)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-white/80"><SlidersHorizontal className="h-4 w-4" />Filters</button><label className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-white/80"><CalendarDays className="h-4 w-4" /><span className="sr-only">Specific date</span><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setWindow("all"); }} className="bg-transparent text-white [color-scheme:dark]" /></label></div><div className="flex gap-2 overflow-x-auto pb-1">{windowOptions.map(([id, label]) => <button key={id} type="button" onClick={() => { setWindow(id); setDate(""); }} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs", window === id ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/15 text-white/65")}>{label}</button>)}</div>{showFilters ? <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2 lg:grid-cols-3"><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">Every category</option>{EVENT_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select value={genre} onChange={(e) => setGenre(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">Every genre</option>{genres.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select><select value={venue} onChange={(e) => setVenue(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">Every venue</option>{venues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={access} onChange={(e) => setAccess(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="all">Any access</option><option value="free">Free</option><option value="ticketed">Ticketed</option><option value="reservations">Reservations</option></select><select value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="all">Any price</option><option value="under-10">Under €10</option><option value="10-25">€10–25</option><option value="25-plus">€25+</option></select></div> : null}</div><p className="mt-4 text-xs text-white/45">{filtered.length} {filtered.length === 1 ? "event" : "events"} · {city}</p>{filtered.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} saved={savedEventIds.includes(event.id)} />)}</div> : <div className="mt-8 space-y-3"><EmptyState title="Nothing matches this plan yet" description="Try a different date or open up the filters. New nights are added regularly." icon={<CalendarDays className="h-10 w-10" />} /><p className="text-center text-sm"><Link href="/business" className="text-sky-300 hover:underline">Submit an event →</Link></p></div>}</div>;
}
