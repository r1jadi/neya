"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Check, ChevronRight, MapPin, Sparkles, GripVertical, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MyNightButton } from "@/components/my-night/my-night-button";
import { formatEventWhen } from "@/lib/event-dates";
import { VIBES, BUDGETS, type RecommendationItem, type RecommendationVibe, type RecommendationBudget } from "@/lib/recommendations";
import type { NightStopDisplay } from "@/types";
import { buildNightPlan, type NightPlanItem } from "@/lib/my-night/build-plan";
import { useMyNight } from "@/components/my-night/my-night-provider";

const DISTANCES = ["2", "5", "10", "25"] as const;
const CATEGORIES = ["nightlife", "dj_set", "live_music", "concert", "food_drink", "culture", "rooftop"] as const;

type ApiResponse = { recommendations?: RecommendationItem[]; error?: string };

function stopFor(item: RecommendationItem): NightStopDisplay {
  return {
    stopId: "",
    kind: item.kind,
    refId: item.id,
    title: item.title,
    subtitle: item.venueName ?? null,
    time: item.startsAt ?? null,
    image: item.image,
    slug: item.slug,
    lat: null,
    lng: null,
    available: true,
  };
}

export function TonightRecommendations() {
  const [step, setStep] = useState(0);
  const [vibe, setVibe] = useState<RecommendationVibe | "">("");
  const [budget, setBudget] = useState<RecommendationBudget | "">("");
  const [distance, setDistance] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [results, setResults] = useState<RecommendationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<NightPlanItem[] | null>(null);
  const { addStop, stops } = useMyNight();

  const canContinue = step === 0 ? Boolean(vibe) : step === 1 ? Boolean(budget) : step === 2 ? Boolean(distance) : true;
  const toggleCategory = (category: string) => setCategories((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category]);

  async function submit() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (vibe) params.set("vibe", vibe);
    if (budget) params.set("budget", budget);
    if (distance) params.set("distance", distance);
    if (categories.length) params.set("categories", categories.join(","));
    if (time) {
      const [from, to] = time.split("-");
      params.set("from", `${new Date().toISOString().slice(0, 10)}T${from}:00`);
      params.set("to", `${new Date().toISOString().slice(0, 10)}T${to}:00`);
    }
    try {
      const response = await fetch(`/api/recommendations?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error ?? "Could not load recommendations");
      setResults(data.recommendations ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load recommendations");
    } finally {
      setLoading(false);
    }
  }

  if (results) {
    if (plan) {
      return <NightPlan results={plan} onBack={() => setPlan(null)} onRemove={(index) => setPlan((current) => current?.filter((_, i) => i !== index) ?? null)} onMove={(from, to) => setPlan((current) => { if (!current || to < 0 || to >= current.length) return current; const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; })} onSave={() => { plan.forEach((item) => { if (!stops.some((stop) => stop.kind === item.kind && stop.refId === item.id)) addStop(stopFor(item)); }); }} />;
    }
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6" aria-live="polite">
        <div className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/35 via-zinc-950/80 to-sky-950/30 p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Tonight for you</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-white sm:text-3xl">Your night, sorted.</h2>
            </div>
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setPlan(buildNightPlan(results))}>Build My Night</Button><Button variant="secondary" size="sm" onClick={() => { setResults(null); setStep(0); }}>Start over</Button></div>
          </div>
          {results.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {results.map((item) => (
                <article key={`${item.kind}-${item.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <div className="flex gap-4 p-3 sm:p-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-28 sm:w-28">
                      <Image src={item.image} alt="" fill className="object-cover" sizes="112px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">{item.kind === "event" ? "Event" : "Place"}</p>
                          <h3 className="mt-1 line-clamp-2 font-semibold text-white">{item.title}</h3>
                        </div>
                        <MyNightButton stop={stopFor(item)} variant="default" />
                      </div>
                      {item.venueName ? <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/55"><MapPin className="h-3 w-3" />{item.venueName}</p> : null}
                      {item.startsAt ? <p className="mt-1 flex items-center gap-1 text-xs text-sky-200/80"><CalendarClock className="h-3 w-3" />{formatEventWhen(item.startsAt)}</p> : null}
                      <p className="mt-2 text-xs leading-relaxed text-white/60">{item.reasons.join(" · ")}</p>
                    </div>
                  </div>
                  <Link href={item.kind === "event" ? `/events/${item.slug}` : `/venues/${item.slug}`} className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs font-semibold text-sky-300 hover:bg-white/5">
                    View details <ChevronRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-white/60">Nothing matches those preferences tonight. Try widening your distance or choosing another vibe.</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6" aria-labelledby="tonight-recommendations-title">
      <div className="overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-950/35 via-zinc-950/80 to-fuchsia-950/25 p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-fuchsia-500 text-black"><Sparkles className="h-5 w-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Find your move</p><h2 id="tonight-recommendations-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-white sm:text-3xl">What should I do tonight?</h2><p className="mt-2 text-sm text-white/55">A few quick answers, then we’ll line up the best options in the city.</p></div>
        </div>
        <div className="mt-8">
          {step === 0 ? <ChoiceGroup title="What vibe are you looking for?" options={VIBES} value={vibe} onChange={setVibe} /> : null}
          {step === 1 ? <ChoiceGroup title="What is your budget?" options={BUDGETS} value={budget} onChange={setBudget} /> : null}
          {step === 2 ? <ChoiceGroup title="How far are you willing to go?" options={DISTANCES.map((value) => `${value} km`)} value={distance ? `${distance} km` : ""} onChange={(value) => setDistance(value.split(" ")[0])} /> : null}
          {step === 3 ? <div><h3 className="text-lg font-semibold text-white">Any preferred categories or activities?</h3><div className="mt-4 flex flex-wrap gap-2">{CATEGORIES.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} className={`rounded-full border px-3 py-2 text-sm capitalize ${categories.includes(category) ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white" : "border-white/15 text-white/65"}`}>{categories.includes(category) ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{category.replace(/_/g, " ")}</button>)}</div></div> : null}
          {step === 4 ? <div><h3 className="text-lg font-semibold text-white">When would you like to go?</h3><div className="mt-4 flex flex-wrap gap-2">{[["", "Any time tonight"], ["18:00-21:00", "Early evening"], ["21:00-23:59", "Late evening"], ["23:00-23:59", "After 23:00"]].map(([value, label]) => <button key={label} type="button" onClick={() => setTime(value)} className={`rounded-full border px-3 py-2 text-sm ${time === value ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white" : "border-white/15 text-white/65"}`}>{label}</button>)}</div></div> : null}
          {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
          <div className="mt-8 flex flex-wrap justify-between gap-3"><Button variant="ghost" disabled={step === 0 || loading} onClick={() => setStep((value) => value - 1)}>Back</Button>{step < 4 ? <Button disabled={!canContinue || loading} onClick={() => setStep((value) => value + 1)}>Continue <ChevronRight className="h-4 w-4" /></Button> : <Button disabled={loading} onClick={() => void submit()}>{loading ? "Finding your night…" : "Show my night"}</Button>}</div>
        </div>
      </div>
    </section>
  );
}

function NightPlan({ results, onBack, onRemove, onMove, onSave }: { results: NightPlanItem[]; onBack: () => void; onRemove: (index: number) => void; onMove: (from: number, to: number) => void; onSave: () => void }) {
  return <div className="mx-auto w-full max-w-2xl px-4 pb-14 sm:px-6"><div className="rounded-3xl border border-fuchsia-500/25 bg-zinc-950/80 p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Build My Night</p><h2 className="mt-2 text-2xl font-bold text-white">Your evening timeline</h2></div><Button variant="secondary" size="sm" onClick={onBack}>Back to results</Button></div>{results.length ? <ol className="mt-6 space-y-3">{results.map((item, index) => <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><GripVertical className="h-4 w-4 shrink-0 text-white/30" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{item.timeLabel} · {item.activity}</p><Link href={item.kind === "event" ? `/events/${item.slug}` : `/venues/${item.slug}`} className="mt-1 block truncate font-semibold text-white hover:underline">{item.title}</Link><p className="mt-1 text-xs text-white/55">{item.venueName ?? "Location details"} · {item.estimatedCost}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded p-1 text-white/50 disabled:opacity-20" aria-label="Move earlier">↑</button><button type="button" disabled={index === results.length - 1} onClick={() => onMove(index, index + 1)} className="rounded p-1 text-white/50 disabled:opacity-20" aria-label="Move later">↓</button><button type="button" onClick={() => onRemove(index)} className="rounded p-1 text-white/50 hover:text-red-200" aria-label={`Remove ${item.title}`}><X className="h-4 w-4" /></button></div></li>)}</ol> : <p className="mt-6 rounded-xl border border-white/10 p-6 text-center text-sm text-white/60">Not enough compatible options are available tonight to build a plan.</p>}{results.length ? <Button className="mt-6 w-full" onClick={onSave}>Save to My Night</Button> : null}</div></div>;
}

function ChoiceGroup<T extends string>({ title, options, value, onChange }: { title: string; options: readonly T[]; value: T | ""; onChange: (value: T) => void }) {
  return <div><h3 className="text-lg font-semibold text-white">{title}</h3><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-2xl border px-3 py-3 text-left text-sm capitalize transition ${value === option ? "border-sky-400/60 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25"}`}>{option}</button>)}</div></div>;
}
