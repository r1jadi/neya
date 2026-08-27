"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, MapPin, Radio, Users } from "lucide-react";
import { LIVE_NOW_FILTERS, type LiveNowFilter, type LiveNowItem } from "@/lib/live-now";

const labels: Record<LiveNowFilter, string> = { all: "All", nearby: "Nearby", music: "Music", party: "Party", food: "Food", drinks: "Drinks" };

export function LiveNowPanel() {
  const [filter, setFilter] = useState<LiveNowFilter>("all");
  const [items, setItems] = useState<LiveNowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++requestId.current;
    const request = window.setTimeout(() => {
      setLoading(true);
      setError(false);
    }, 0);
    fetch(`/api/live-now?filter=${filter}`, { cache: "no-store" }).then(async (response) => {
      const data = (await response.json()) as { items?: LiveNowItem[] };
      if (!response.ok) throw new Error();
      if (!cancelled && id === requestId.current) setItems(data.items ?? []);
    }).catch(() => { if (!cancelled && id === requestId.current) setError(true); }).finally(() => { if (!cancelled && id === requestId.current) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(request); };
  }, [filter]);

  return <section className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-14 sm:px-6" aria-labelledby="live-now-title">
    <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/30 via-zinc-950/80 to-sky-950/25 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"><Radio className="h-3.5 w-3.5" /> Live Now</p><h2 id="live-now-title" className="mt-2 text-2xl font-bold text-white sm:text-3xl">What’s happening right now?</h2><p className="mt-2 text-sm text-white/55">Open places and events moving across the city.</p></div><div className="flex flex-wrap gap-1.5">{LIVE_NOW_FILTERS.map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === value ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/15 text-white/60"}`}>{labels[value]}</button>)}</div></div>
      {loading ? <div className="mt-6 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/50">Checking what’s live…</div> : error ? <div className="mt-6 rounded-2xl border border-red-400/20 p-8 text-center text-sm text-red-200">Live Now is temporarily unavailable.</div> : items.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, 12).map((item) => <article key={`${item.kind}-${item.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"><div className="flex gap-3 p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"><Image src={item.image} alt="" fill className="object-cover" sizes="80px" /></div><div className="min-w-0"><p className={`text-[10px] font-semibold uppercase tracking-widest ${item.status === "live" ? "text-emerald-300" : "text-sky-300"}`}>{item.status === "live" ? "Live now" : item.kind === "venue" ? "Open now" : "Starting soon"}</p><h3 className="mt-1 line-clamp-2 font-semibold text-white">{item.title}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs text-white/50"><MapPin className="h-3 w-3" />{item.location ?? "Location available"}</p>{item.startsAt ? <p className="mt-1 flex items-center gap-1 text-xs text-sky-200/70"><CalendarClock className="h-3 w-3" />{new Date(item.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{item.endsAt ? `–${new Date(item.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</p> : null}</div></div><div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-xs text-white/45">{item.crowdCount != null ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.crowdCount} here now</span> : <span>{item.reason}</span>}<Link href={item.kind === "event" ? `/events/${item.slug}` : `/venues/${item.slug}`} className="font-semibold text-sky-300 hover:text-white">Details →</Link></div></article>)}</div> : <div className="mt-6 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/55">Nothing matches this filter right now. Try another view.</div>}
    </div>
  </section>;
}
