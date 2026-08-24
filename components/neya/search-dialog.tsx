"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, Compass, MapPin, Search, X } from "lucide-react";
import { PLACEHOLDER_IMAGE } from "@/lib/images";
import type { SearchResponse, SearchResultItem } from "@/app/api/search/route";

const GROUP_LABELS: Record<string, { label: string; icon?: React.ReactNode }> = {
  events: { label: "Events" },
  venues: { label: "Venues" },
  guides: { label: "Guides" },
};

function useDebouncedValue(value: string, delay = 220) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const SUGGESTIONS = [
  { label: "Explore tonight", href: "/events?when=tonight", icon: <CalendarDays className="h-4 w-4" /> },
  { label: "Browse venues", href: "/#venues", icon: <MapPin className="h-4 w-4" /> },
  { label: "Browse guides", href: "/guides", icon: <Compass className="h-4 w-4" /> },
  { label: "Open the map", href: "/map", icon: <MapPin className="h-4 w-4" /> },
];

function ResultRow({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
        {item.image ? (
          <Image src={item.image} alt="" fill className="object-cover" sizes="44px" />
        ) : (
          <Image src={PLACEHOLDER_IMAGE} alt="" fill className="object-cover opacity-40" sizes="44px" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
        {item.subtitle ? <p className="truncate text-xs text-white/50">{item.subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.meta ? <span className="text-xs text-white/45">{item.meta}</span> : null}
        <ArrowRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
      </div>
    </Link>
  );
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query);

  // Global shortcut: Cmd/Ctrl + K toggles the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the input when opened.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Block body scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const trimmed = debounced.trim();
  const fetchSearch = useCallback(async (value: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as SearchResponse;
      setData(json);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (trimmed.length < 2) return;
    const id = window.setTimeout(() => void fetchSearch(trimmed), 80);
    return () => window.clearTimeout(id);
  }, [trimmed, fetchSearch]);

  const groupOrder = useMemo(() => {
    if (!data) return [];
    return (["events", "venues", "guides"] as const).filter((key) => (data.groups[key]?.length ?? 0) > 0);
  }, [data]);

  const total = data?.total ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search events, venues and guides"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white/60 transition hover:border-sky-400/40 hover:text-white"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/40 lg:inline">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm sm:pt-[12vh]"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Search NEYA"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-white/40" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim().length < 2) {
                      setData(null);
                      setLoading(false);
                      setError(false);
                    }
                  }}
                  placeholder="Search events, venues, guides…"
                  className="h-9 w-full bg-transparent text-base text-white placeholder:text-white/35 focus:outline-none"
                  aria-label="Search NEYA"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <kbd className="hidden shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/40 sm:inline">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {!query.trim() ? (
                  <div className="p-3">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wider text-white/40">Explore</p>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <Link
                          key={s.label}
                          href={s.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
                        >
                          <span className="text-sky-300">{s.icon}</span>
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {loading ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-2 py-2">
                        <div className="h-11 w-11 animate-pulse rounded-lg bg-white/5" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
                          <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-white/70">Something went wrong.</p>
                    <button
                      type="button"
                      onClick={() => void fetchSearch(trimmed)}
                      className="mt-3 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-sky-400/40 hover:text-white"
                    >
                      Try again
                    </button>
                  </div>
                ) : null}

                {!loading && !error && query.trim().length >= 2 && total === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-lg font-semibold text-white">Nothing found for “{query.trim()}”</p>
                    <p className="mt-1 text-sm text-white/50">Try a venue name, a genre, or a city.</p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href="/events?when=tonight"
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-sky-400/40 hover:text-white"
                      >
                        Explore tonight
                      </Link>
                      <Link
                        href="/guides"
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
                      >
                        Browse guides
                      </Link>
                    </div>
                  </div>
                ) : null}

                {!loading && !error && total > 0 ? (
                  <div className="space-y-3 p-1">
                    {groupOrder.map((group) => (
                      <section key={group}>
                        <div className="flex items-center justify-between px-2 pt-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                            {GROUP_LABELS[group]?.label ?? group}
                          </p>
                          <span className="text-[11px] text-white/30">{data!.groups[group]!.length}</span>
                        </div>
                        <div className="mt-1">
                          {data!.groups[group]!.map((item) => (
                            <ResultRow key={`${group}-${item.id}`} item={item} />
                          ))}
                        </div>
                      </section>
                    ))}
                    <p className="px-2 pb-1 pt-2 text-center text-[11px] text-white/30">
                      {total} result{total === 1 ? "" : "s"} for “{query.trim()}”
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
