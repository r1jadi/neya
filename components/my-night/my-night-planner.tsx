"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarDays, Check, MapPin, Pencil, Share2, Sparkles, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { NightMap, type NightMapStop } from "@/components/my-night/night-map";
import { useMyNight } from "@/components/my-night/my-night-provider";
import { EmptyState } from "@/components/neya/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEventWhen } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import type { MyNightPlan } from "@/types";

export function MyNightPlanner({ initialPlan }: { initialPlan: MyNightPlan | null }) {
  const { hydrated, title, stops, rename, share, clear, moveStop, removeStop } = useMyNight();
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied" | "error">("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayStops = hydrated ? stops : (initialPlan?.stops ?? []);
  const displayTitle = hydrated ? title : (initialPlan?.title ?? "My Night");
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("en-GB", { weekday: "long" }),
  );

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
        await navigator.share({ title: displayTitle, text: "My night plan on NEYA", url });
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
                aria-label="Plan title"
                autoFocus
                className="w-56"
              />
              <Button type="submit" size="sm">Save</Button>
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
                aria-label="Edit plan title"
                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-white/55">
            {todayLabel} · plan your night in {3 - displayStops.length === 0 ? "a full" : `${3 - displayStops.length} more`} stop
            {3 - displayStops.length === 1 ? "" : "s"}
            {displayStops.length >= 3 ? " — night is full" : ""}
          </p>
        </div>
        {displayStops.length ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={handleShare} disabled={shareState === "sharing"}>
              {shareState === "sharing" ? (
                "Sharing…"
              ) : shareState === "copied" ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Link copied!
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" /> Share My Night
                </>
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clear} className="text-white/60 hover:text-red-200">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        ) : null}
      </div>

      {shareState === "error" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Couldn&apos;t create a share link — try again in a moment.
        </p>
      ) : null}

      {displayStops.length ? (
        <div className="mt-8 space-y-6">
          <ul className="space-y-3">
            {displayStops.map((stop, index) => (
              <li
                key={stop.refId}
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500 font-[family-name:var(--font-display)] text-sm font-bold text-black">
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
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1 self-center">
                  <button
                    type="button"
                    onClick={() => moveStop(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${stop.title} up`}
                    className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-20"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(index)}
                    aria-label={`Remove ${stop.title}`}
                    className="rounded-lg p-1.5 text-white/50 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStop(index, index + 1)}
                    disabled={index === displayStops.length - 1}
                    aria-label={`Move ${stop.title} down`}
                    className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-20"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">Your route</h2>
            <p className="mt-1 text-xs text-white/40">
              Drag cards to reorder, or use the arrows. The route follows your order.
            </p>
            <NightMap stops={mapStops} className="mt-3" />
          </section>

          {displayStops.length < 3 ? (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
              <Sparkles className="h-4 w-4 text-fuchsia-300" />
              Add up to {3 - displayStops.length} more stop{3 - displayStops.length === 1 ? "" : "s"} from
              any event or venue — the + My Night button is right on the cards.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="Plan your night"
            description="Pick up to 3 venues or events and build your perfect night — then share the plan with friends."
            icon={<Sparkles className="h-8 w-8" />}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/events">Explore events</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/#venues">Explore venues</Link>
            </Button>
          </div>
        </div>
      )}

      {displayStops.length ? (
        <p className="mt-8 text-center text-xs text-white/35">
          Tip: drag a card to reorder — the route updates automatically.
        </p>
      ) : null}
    </div>
  );
}
