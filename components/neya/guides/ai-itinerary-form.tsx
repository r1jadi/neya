"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeneratedItinerary } from "@/types/guides";

export function AiItineraryForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedItinerary | null>(null);
  const [prefs, setPrefs] = useState({
    duration_days: 2,
    budget_eur: 100,
    nightlife: false,
    nature: false,
    food: true,
    culture: true,
    hiking: false,
  });

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/guides/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          interests: [
            prefs.nightlife && "nightlife",
            prefs.nature && "nature",
            prefs.food && "food",
            prefs.culture && "culture",
            prefs.hiking && "hiking",
          ].filter(Boolean),
        }),
      });
      const data = await res.json();
      setResult(data.itinerary ?? data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-300" />
        <h3 className="text-lg font-semibold text-white">AI Itinerary Generator</h3>
      </div>
      <p className="mt-1 text-sm text-white/55">
        Tell us your preferences and we&apos;ll build a personalized Kosovo itinerary from our guides.
      </p>

      <form onSubmit={generate} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-white/50">Duration (days)</span>
            <Input
              type="number"
              min={1}
              max={14}
              value={prefs.duration_days}
              onChange={(e) => setPrefs({ ...prefs, duration_days: Number(e.target.value) })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-white/50">Budget (€)</span>
            <Input
              type="number"
              min={0}
              value={prefs.budget_eur}
              onChange={(e) => setPrefs({ ...prefs, budget_eur: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          {(["nightlife", "nature", "food", "culture", "hiking"] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm capitalize text-white/70">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="rounded border-white/20"
              />
              {key}
            </label>
          ))}
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Generating…" : "Generate itinerary"}
        </Button>
      </form>

      {result ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-white/70">{result.summary}</p>
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
              <li key={d.day}>
                <p className="text-sm font-semibold text-white">Day {d.day}</p>
                <ul className="mt-1 list-inside list-disc text-sm text-white/55">
                  {d.stops.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
