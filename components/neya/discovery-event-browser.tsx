"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/neya/event-card";
import { EmptyState } from "@/components/neya/empty-state";
import { EVENT_CATEGORIES, eventMatchesQuery } from "@/lib/discovery";
import { CITY_TZ, isTonight } from "@/lib/event-dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";
import { useI18n } from "@/lib/i18n";

type Props = { events: Event[]; savedEventIds: string[]; city: string; initialWindow?: string; initialCategory?: string; initialGenre?: string; initialAccess?: string };
type WindowId = "all" | "tonight" | "tomorrow" | "week" | "weekend" | "next-week";
function ymd(iso: string) { return new Date(iso).toLocaleDateString("en-CA", { timeZone: CITY_TZ }); }
function addDays(date: string, count: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + count); return value.toLocaleDateString("en-CA"); }
function weekBounds(today: string, offset = 0) { const value = new Date(`${today}T12:00:00`); const day = value.getDay() || 7; return [addDays(today, 1 - day + offset * 7), addDays(today, 7 - day + offset * 7)] as const; }
function useDebouncedValue(value: string, delay = 180) { const [debounced, setDebounced] = useState(value); useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]); return debounced; }

export function DiscoveryEventBrowser({ events, savedEventIds, city, initialWindow, initialCategory, initialGenre, initialAccess }: Props) {
  const { t } = useI18n();
  const windowOptions = [
    ["all", t.eventsPage.allUpcoming],
    ["tonight", t.eventsPage.tonight],
    ["tomorrow", t.eventsPage.tomorrow],
    ["week", t.eventsPage.thisWeek],
    ["weekend", t.eventsPage.thisWeekend],
    ["next-week", t.eventsPage.nextWeek],
  ] as const;
  const selectedWindow = windowOptions.some(([value]) => value === initialWindow) ? (initialWindow as WindowId) : "all";
  const selectedCategory = EVENT_CATEGORIES.some((item) => item.id === initialCategory) ? initialCategory! : "";
  const selectedGenre = initialGenre?.trim() ?? "";
  const selectedAccess = ["all", "free", "ticketed", "reservations"].includes(initialAccess ?? "") ? (initialAccess as "all" | "free" | "ticketed" | "reservations") : "all";
  const [query, setQuery] = useState(""); const debouncedQuery = useDebouncedValue(query); const [window, setWindow] = useState(selectedWindow); const [category, setCategory] = useState(selectedCategory); const [genre, setGenre] = useState(selectedGenre); const [venue, setVenue] = useState(""); const [date, setDate] = useState(""); const [access, setAccess] = useState(selectedAccess); const [price, setPrice] = useState("all"); const [showFilters, setShowFilters] = useState(Boolean(selectedCategory || selectedGenre || selectedAccess !== "all"));
  const lastSearch = useRef(""); const lastFilter = useRef("");
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
  useEffect(() => { if (debouncedQuery.trim().length < 2 || lastSearch.current === debouncedQuery) return; lastSearch.current = debouncedQuery; void trackDiscoveryMetric("discovery_search", { dimensions: { city, result_count: filtered.length } }); }, [city, debouncedQuery, filtered.length]);
  useEffect(() => { const signature = [window, category, genre, venue, date, access, price].join("|"); if (signature === "all|||||all|all" || lastFilter.current === signature) return; lastFilter.current = signature; void trackDiscoveryMetric(category ? "category_select" : "discovery_filter", { dimensions: { city, window, category: category || null, genre: genre || null, access, price, result_count: filtered.length } }); }, [city, window, category, genre, venue, date, access, price, filtered.length]);
  return <div className="mt-8"><div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" /><span className="sr-only">{t.eventsPage.searchLabel}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.eventsPage.searchEvents} className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-white/35" /></label><button type="button" onClick={() => setShowFilters((open) => !open)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-white/80"><SlidersHorizontal className="h-4 w-4" />{t.eventsPage.filters}</button><label className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm text-white/80"><CalendarDays className="h-4 w-4" /><span className="sr-only">{t.eventsPage.specificDate}</span><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setWindow("all"); }} className="bg-transparent text-white [color-scheme:dark]" /></label></div><div className="flex gap-2 overflow-x-auto pb-1">{windowOptions.map(([id, label]) => <button key={id} type="button" onClick={() => { setWindow(id); setDate(""); }} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs", window === id ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100" : "border-white/15 text-white/65")}>{label}</button>)}</div>{showFilters ? <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2 lg:grid-cols-3"><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">{t.eventsPage.everyCategory}</option>{EVENT_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select value={genre} onChange={(e) => setGenre(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">{t.eventsPage.everyGenre}</option>{genres.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select><select value={venue} onChange={(e) => setVenue(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="">{t.eventsPage.everyVenue}</option>{venues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={access} onChange={(e) => setAccess(e.target.value as "all" | "free" | "ticketed" | "reservations")} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="all">{t.eventsPage.anyAccess}</option><option value="free">{t.actions.free}</option><option value="ticketed">{t.eventsPage.ticketed}</option><option value="reservations">{t.eventsPage.reservations}</option></select><select value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"><option value="all">{t.eventsPage.anyPrice}</option><option value="under-10">{t.eventsPage.under10}</option><option value="10-25">{t.eventsPage.from10To25}</option><option value="25-plus">{t.eventsPage.over25}</option></select></div> : null}</div><p className="mt-4 text-xs text-white/45">{filtered.length} {filtered.length === 1 ? t.eventsPage.event : t.eventsPage.events} · {city}</p>{filtered.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} saved={savedEventIds.includes(event.id)} />)}</div> : <div className="mt-8 space-y-3"><EmptyState title={t.eventsPage.nothingMatches} description={t.eventsPage.nothingMatchesDesc} icon={<CalendarDays className="h-10 w-10" />} /><p className="text-center text-sm"><Link href="/business" className="text-sky-300 hover:underline">{t.eventsPage.submitEvent} →</Link></p></div>}</div>;
}
