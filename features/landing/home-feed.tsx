"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Compass, Moon, Sparkles } from "lucide-react";
import { HomeEventCard } from "@/components/neya/home-event-card";
import { tomorrowEvents, tonightEvents, thisWeekend } from "@/lib/event-filters";
import { CITY_TZ, getThisWeekendRange } from "@/lib/event-dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Window = "tonight" | "tomorrow" | "weekend";

/**
 * Date labels are built from Intl parts (not full locale strings) so the
 * server (Node ICU) and the browser always produce identical text — a full
 * `toLocaleDateString` string differs between them (e.g. “Mon 24 Aug” vs
 * “Mon, 24 Aug”) and causes hydration mismatches on the homepage.
 */
function cityDateParts(date: Date, tz = CITY_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: get("weekday"), month: get("month"), day: get("day") };
}

function longDate(tz = CITY_TZ): string {
  const { weekday, month, day } = cityDateParts(new Date(), tz);
  return `${weekday} ${day} ${month}`;
}

function shortDate(offset: number, tz = CITY_TZ): string {
  const { weekday, month, day } = cityDateParts(new Date(Date.now() + offset * 86400000), tz);
  return `${weekday.slice(0, 3)}, ${day} ${month.slice(0, 3)}`;
}

function weekendRange(tz = CITY_TZ): string {
  const { startYmd, endYmd } = getThisWeekendRange(new Date(), tz);
  const fmt = (ymd: string) => {
    const { weekday, month, day } = cityDateParts(new Date(`${ymd}T12:00:00`), tz);
    return `${weekday.slice(0, 3)}, ${day} ${month.slice(0, 3)}`;
  };
  return `${fmt(startYmd)} – ${fmt(endYmd)}`;
}

function buildWindows(t: ReturnType<typeof useI18n>["t"]): { id: Window; label: string; hint: string }[] {
  return [
    { id: "tonight", label: t.homeFeed.tonight, hint: shortDate(0) },
    { id: "tomorrow", label: t.homeFeed.tomorrow, hint: shortDate(1) },
    { id: "weekend", label: t.homeFeed.thisWeekend, hint: weekendRange() },
  ];
}

function sortByCrowd(list: Event[]) {
  return [...list].sort((a, b) => b.crowd_count - a.crowd_count || b.atmosphere_rating - a.atmosphere_rating);
}

function byStart(list: Event[]) {
  return [...list].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

interface HomeFeedProps {
  events: Event[];
  savedEventIds?: string[];
  hasVenues: boolean;
}

export function HomeFeed({ events, savedEventIds, hasVenues }: HomeFeedProps) {
  const { t } = useI18n();
  const [windowId, setWindowId] = useState<Window>("tonight");
  const windows = useMemo(() => buildWindows(t), [t]);

  const view = useMemo(() => {
    const lists: Record<Window, Event[]> = {
      tonight: sortByCrowd(tonightEvents(events)),
      tomorrow: byStart(tomorrowEvents(events)),
      weekend: byStart(thisWeekend(events)),
    };
    return lists[windowId];
  }, [events, windowId]);

  const active = windows.find((w) => w.id === windowId)!;

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-300/90">{t.homeFeed.whatsOn}</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Prishtina · {active.label} · {active.hint}
          </h2>
        </div>
        <div className="flex gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindowId(w.id)}
              aria-pressed={windowId === w.id}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                windowId === w.id ? "text-[#09090b]" : "text-white/65 hover:text-white",
              )}
            >
              {windowId === w.id ? (
                <motion.span
                  layoutId="home-window-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-fuchsia-400 shadow-[0_0_24px_rgba(56,189,248,0.45)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-white/50">
        {t.homeFeed.nightsLinedUp.replace("{count}", String(view.length)).replace("{plural}", view.length === 1 ? t.homeFeed.night : t.homeFeed.nights).replace("{city}", t.venueList.eyebrow).replace("{date}", longDate())}
      </p>

      <div className="mt-5">
        <motion.div
          key={windowId}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {view.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {view.slice(0, 9).map((event, i) => (
                <HomeEventCard
                  key={event.id}
                  event={event}
                  saved={savedEventIds?.includes(event.id)}
                  variant={i === 0 && windowId === "tonight" ? "hero" : "compact"}
                  className={i === 0 && windowId === "tonight" ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}
                />
              ))}
            </div>
          ) : (
            <HomeEmptyState windowId={windowId} hasVenues={hasVenues} onSetWindow={setWindowId} />
          )}
        </motion.div>
      </div>

      {view.length > 0 ? (
        <div className="mt-6 flex items-center justify-center">
          <Link
            href={`/events?when=${windowId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-sky-400/40 hover:text-white"
          >
            {t.homeFeed.viewAllCalendar.replace("{when}", windowId === "tonight" ? t.homeFeed.tonight : windowId === "tomorrow" ? t.homeFeed.tomorrow : t.homeFeed.thisWeekend)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function HomeEmptyState({
  windowId,
  hasVenues,
  onSetWindow,
}: {
  windowId: Window;
  hasVenues: boolean;
  onSetWindow: (w: Window) => void;
}) {
  const { t } = useI18n();
  const headline =
    windowId === "tonight" ? t.homeFeed.nothingTonight : windowId === "tomorrow" ? t.homeFeed.nothingTomorrow : t.homeFeed.nothingWeekend;
  const body =
    windowId === "tonight"
      ? t.homeFeed.quietForNow
      : windowId === "tomorrow"
        ? t.homeFeed.tomorrowOpen
        : t.homeFeed.weekendFree;
  const otherWindow: Window = windowId === "weekend" ? "tomorrow" : "weekend";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-zinc-950/60 to-fuchsia-950/20 px-6 py-14 text-center sm:py-16">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-fuchsia-600/15 blur-[100px]" />
      <div className="relative">
        <Moon className="mx-auto h-10 w-10 text-white/30" />
        <p className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-white">{headline} 👀</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">{body}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <Compass className="h-4 w-4" />
            {t.common.exploreTheMap}
          </Link>
          {hasVenues ? (
            <Link
              href="/#venues"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-sky-400/40 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              {t.myNight.exploreVenues}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => onSetWindow(otherWindow)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
          >
            <CalendarDays className="h-4 w-4" />
            {otherWindow === "weekend" ? t.homeFeed.browseThisWeekend : t.homeFeed.tryTomorrow}
          </button>
        </div>
      </div>
    </div>
  );
}