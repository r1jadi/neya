"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarDays, Check, MapPin, Pencil, Share2, Sparkles, Trash2, X, AlertTriangle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { NightMap, type NightMapStop } from "@/components/my-night/night-map";
import { NightTravelHints } from "@/components/my-night/night-travel-hints";
import { useMyNight } from "@/components/my-night/my-night-provider";
import { EventStatusChip } from "@/components/neya/event-status-chip";
import { EmptyState } from "@/components/neya/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CITY_TZ, formatEventWhen } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { MyNightPlan, NightStopDisplay } from "@/types";

type Range = { start: number; end: number };

function stopRange(stop: NightStopDisplay): Range | null {
  if (!stop.time) return null;
  const start = new Date(stop.time).getTime();
  if (Number.isNaN(start)) return null;
  const end = stop.endsAt ? new Date(stop.endsAt).getTime() : start + 8 * 3600000;
  return { start, end };
}

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

function timeWindow(range: Range): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-GB", { timeZone: CITY_TZ, hour: "2-digit", minute: "2-digit" });
  return `${fmt(range.start)}–${fmt(range.end)}`;
}

/** Which other stops each stop overlaps with (real event times only). */
function findConflicts(stops: NightStopDisplay[]): Map<number, string[]> {
  const conflicts = new Map<number, string[]>();
  for (let i = 0; i < stops.length; i++) {
    const a = stopRange(stops[i]);
    if (!a) continue;
    for (let j = 0; j < stops.length; j++) {
      if (i === j) continue;
      const b = stopRange(stops[j]);
      if (b && overlaps(a, b)) {
        const list = conflicts.get(i) ?? [];
        list.push(`${stops[j].title} · ${timeWindow(b)}`);
        conflicts.set(i, list);
      }
    }
  }
  return conflicts;
}

export function MyNightPlanner({ initialPlan }: { initialPlan: MyNightPlan | null }) {
  const { t } = useI18n();
  const { hydrated, title, stops, rename, share, clear, moveStop, removeStop } = useMyNight();
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied" | "error">("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayStops = useMemo(() => (hydrated ? stops : (initialPlan?.stops ?? [])), [hydrated, stops, initialPlan]);
  const displayTitle = hydrated ? title : (initialPlan?.title ?? t.myNight.titleDefault);
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("en-GB", { weekday: "long" }),
  );
  const conflicts = useMemo(() => findConflicts(displayStops), [displayStops]);

  async function handleShare() {
    if (!displayStops.length) return;
    setShareState("sharing");
    const url = await share();
    if (!url) {
      setShareState("error");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: displayTitle, text: t.myNight.shareText, url });
        setShareState("idle");
        return;
      }
    } catch {
      // User dismissed the native sheet — fall through to copy.
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      if (shareTimer.current) clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
    }
  }

  function submitTitle() {
    rename(titleDraft || displayTitle);
    setEditingTitle(false);
  }

  function handleDrop(to: number) {
    if (dragIndex == null) return;
    moveStop(dragIndex, to);
    setDragIndex(null);
  }

  const mapStops: NightMapStop[] = displayStops
    .map((s, i) => ({ index: i, title: s.title, lat: s.lat ?? NaN, lng: s.lng ?? NaN }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  const travelStops = displayStops.map((s) => ({ lat: s.lat ?? NaN, lng: s.lng ?? NaN }));

  const hasConflicts = [...conflicts.values()].some((list) => list.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editingTitle ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitTitle();
              }}
            >
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                maxLength={40}
                aria-label={t.myNight.planTitleLabel}
                autoFocus
                className="w-56"
              />
              <Button type="submit" size="sm">{t.actions.save}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
                {displayTitle}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(displayTitle);
                  setEditingTitle(true);
                }}
                aria-label={t.myNight.editTitle}
                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-white/55">
            {todayLabel} ·{" "}
            {displayStops.length >= 3
              ? t.myNight.planFull
              : t.myNight.planHint
                  .replace("{count}", String(3 - displayStops.length))
                  .replace("{plural}", 3 - displayStops.length === 1 ? t.myNight.stop : t.myNight.stops)}
          </p>
        </div>
        {displayStops.length ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={handleShare} disabled={shareState === "sharing"}>
              {shareState === "sharing" ? (
                t.myNight.sharing
              ) : shareState === "copied" ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {t.myNight.linkCopied}
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" /> {t.myNight.share}
                </>
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clear} className="text-white/60 hover:text-red-200">
              <Trash2 className="h-3.5 w-3.5" /> {t.myNight.clear}
            </Button>
          </div>
        ) : null}
      </div>

      {shareState === "error" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {t.myNight.shareError}
        </p>
      ) : null}

      {hasConflicts ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t.myNight.overlapWarning}
        </p>
      ) : null}

      {displayStops.length ? (
        <div className="mt-8 space-y-6">
          <ul className="space-y-3">
            {displayStops.map((stop, index) => {
              const stopConflicts = conflicts.get(index) ?? [];
              return (
                <li key={stop.refId} className="space-y-1">
                  <div
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => setDragIndex(null)}
                    className={cn(
                      "flex gap-3 rounded-2xl border bg-zinc-950/60 p-3 transition",
                      dragIndex === index ? "border-fuchsia-400/50 opacity-60" : "border-white/[0.08]",
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500 font-[family-name:var(--font-display)] text-sm font-bold text-[#09090b]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {stop.image ? (
                      <Image
                        src={stop.image}
                        alt=""
                        width={72}
                        height={72}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 self-center">
                      <div className="flex flex-wrap items-center gap-2">
                        {stop.slug && stop.available ? (
                          <Link
                            href={stop.kind === "event" ? `/events/${stop.slug}` : `/venues/${stop.slug}`}
                            className="font-semibold text-white hover:underline"
                          >
                            {stop.title}
                          </Link>
                        ) : (
                          <p className={cn("font-semibold", stop.available ? "text-white" : "text-white/50")}>
                            {stop.title}
                          </p>
                        )}
                        {stop.kind === "event" && stop.time ? (
                          <EventStatusChip startsAt={stop.time} endsAt={stop.endsAt} className="py-0.5" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                        {stop.time ? (
                          <span className="inline-flex items-center gap-1 text-sky-300/90">
                            <CalendarDays className="h-3 w-3" />
                            {formatEventWhen(stop.time)}
                          </span>
                        ) : null}
                        {stop.subtitle ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {stop.subtitle}
                          </span>
                        ) : null}
                      </p>
                      {stopConflicts.length ? (
                        <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-100">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {t.myNight.overlapsWith.replace("{name}", stopConflicts[0])}
                            {stopConflicts.length > 1 ? ` ${t.myNight.moreCount.replace("{count}", String(stopConflicts.length - 1))}` : ""}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1 self-center">
                      <button
                        type="button"
                        onClick={() => moveStop(index, index - 1)}
                        disabled={index === 0}
                        aria-label={t.myNight.moveUp.replace("{name}", stop.title)}
                        className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        aria-label={t.myNight.removeStop.replace("{name}", stop.title)}
                        className="rounded-lg p-1.5 text-white/50 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStop(index, index + 1)}
                        disabled={index === displayStops.length - 1}
                        aria-label={t.myNight.moveDown.replace("{name}", stop.title)}
                        className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {index < displayStops.length - 1 && travelStops[index] && travelStops[index + 1] ? (
                    <NightTravelHints from={travelStops[index]} to={travelStops[index + 1]} />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">{t.myNight.yourRoute}</h2>
            <p className="mt-1 text-xs text-white/40">
              {t.myNight.routeHint}
            </p>
            <NightMap stops={mapStops} className="mt-3" />
          </section>

          {displayStops.length < 3 ? (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
              <Sparkles className="h-4 w-4 text-fuchsia-300" />
              {t.myNight.addMore
                .replace("{count}", String(3 - displayStops.length))
                .replace("{plural}", 3 - displayStops.length === 1 ? t.myNight.stop : t.myNight.stops)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title={t.myNight.planYourNight}
            description={t.myNight.planYourNightDesc}
            icon={<Sparkles className="h-8 w-8" />}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/events">{t.myNight.exploreEvents}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/#venues">{t.myNight.exploreVenues}</Link>
            </Button>
          </div>
        </div>
      )}

      {displayStops.length ? (
        <p className="mt-8 text-center text-xs text-white/35">
          {t.myNight.tipReorder}
        </p>
      ) : null}
    </div>
  );
}