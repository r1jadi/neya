"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedItinerary } from "@/types/guides";
import { cn } from "@/lib/utils";

const INTERESTS = [
  { id: "nightlife", label: "🌙 Nightlife" },
  { id: "food", label: "🍽 Food" },
  { id: "culture", label: "🏛 Culture" },
  { id: "nature", label: "🌿 Nature" },
  { id: "adventure", label: "⛰ Adventure" },
] as const;

const DURATIONS = [
  { key: "1d", days: 1, label: "1 day" },
  { key: "2d", days: 2, label: "2 days" },
  { key: "3d", days: 3, label: "3 days" },
  { key: "weekend", days: 2, label: "Weekend" },
] as const;

type DurationKey = (typeof DURATIONS)[number]["key"];

const BUDGETS = [
  { eur: 50, label: "€50" },
  { eur: 100, label: "€100" },
  { eur: 200, label: "€200+" },
] as const;

type InterestId = (typeof INTERESTS)[number]["id"];

export function AiItineraryForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedItinerary | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<InterestId[]>(["nightlife", "food"]);
  const [durationKey, setDurationKey] = useState<DurationKey>("2d");
  const [budgetEur, setBudgetEur] = useState(100);
  const durationDays = DURATIONS.find((d) => d.key === durationKey)!.days;

  function toggleInterest(id: InterestId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected.length) return;
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch("/api/guides/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_days: durationDays,
          budget_eur: budgetEur,
          interests: selected,
          nightlife: selected.includes("nightlife"),
          nature: selected.includes("nature"),
          food: selected.includes("food"),
          culture: selected.includes("culture"),
          hiking: selected.includes("adventure"),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setResult(data.itinerary ?? data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-zinc-950 to-fuchsia-950/25 p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-fuchsia-600/15 blur-[90px]" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
            <Sparkles className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">Build your trip</h2>
            <p className="text-sm text-white/55">Tell NEYA what you&apos;re into — we&apos;ll plan it around real guides.</p>
          </div>
        </div>

        <form onSubmit={generate} className="mt-7 space-y-6">
          <div className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> What are you into?
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const active = selected.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      active
                        ? "border-violet-400/70 bg-violet-500/20 text-violet-50"
                        : "border-white/15 text-white/65 hover:border-violet-400/40 hover:text-white",
                    )}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
                <CalendarDays className="h-3.5 w-3.5 text-sky-300" /> How long?
              </p>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((duration) => {
                  const active = durationKey === duration.key;
                  return (
                    <button
                      key={duration.key}
                      type="button"
                      onClick={() => setDurationKey(duration.key)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        active
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-50"
                          : "border-white/15 text-white/65 hover:border-sky-400/40 hover:text-white",
                      )}
                    >
                      {duration.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/45">
                <Wallet className="h-3.5 w-3.5 text-emerald-300" /> Budget
              </p>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((budget) => {
                  const active = budgetEur === budget.eur;
                  return (
                    <button
                      key={budget.eur}
                      type="button"
                      onClick={() => setBudgetEur(budget.eur)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        active
                          ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-50"
                          : "border-white/15 text-white/65 hover:border-emerald-400/40 hover:text-white",
                      )}
                    >
                      {budget.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/40">
              {selected.length
                ? `${durationDays} day${durationDays === 1 ? "" : "s"} · ${budgetEur === 200 ? "€200+" : `€${budgetEur}`} · ${selected.join(", ")}`
                : "Pick at least one interest to begin."}
            </p>
            <Button
              type="submit"
              disabled={loading || !selected.length}
              size="lg"
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_40px_rgba(167,139,250,0.35)] hover:brightness-110 sm:w-auto"
            >
              {loading ? "Building your trip…" : "Build my trip"}
            </Button>
          </div>
        </form>

        {error ? (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            We couldn&apos;t build your trip right now. Please try again in a moment.
          </p>
        ) : null}

        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-white/75">{result.summary}</p>
            </div>
            {result.guide_slugs?.length ? (
              <p className="text-xs text-white/45">
                Based on:{" "}
                {result.guide_slugs.map((s) => (
                  <a key={s} href={`/guides/${s}`} className="text-sky-300 hover:underline">
                    {s}
                  </a>
                ))}
              </p>
            ) : null}
            <ol className="space-y-3">
              {result.days?.map((d) => (
                <li key={d.day} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">Day {d.day}</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-white/60">
                    {d.stops.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
