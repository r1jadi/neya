"use client";

import { useCallback, useMemo, useState } from "react";
import { Radio, Users } from "lucide-react";
import { submitAtmosphereReview } from "@/actions/atmosphere";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import { createClient } from "@/lib/supabase/client";
import type { EventPulse } from "@/services/pulse";
import { cn, neyaPrimaryGradient } from "@/lib/utils";

type EventRow = { atmosphere_rating?: number };

interface LiveAtmospherePanelProps {
  eventId: string;
  venueId: string;
  eventSlug: string;
  initialScore: number;
  /** Real aggregates from recent reviews; null when unavailable. */
  pulse?: EventPulse | null;
  /** Real “here now” count from the event row. */
  crowdCount?: number;
  /** Event has ended (by clock) — suppress live badges and pulse submission. */
  ended?: boolean;
}

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

function SliderRow({
  label,
  icon,
  value,
  onChange,
  accent,
}: {
  label: string;
  icon: string;
  value: number;
  onChange: (value: number) => void;
  accent?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-white/70">
          {icon} {label}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 font-bold tabular-nums text-[#09090b]", accent ?? "bg-sky-400")}>{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(parseInt(event.target.value, 10))}
        className="neya-slider mt-2 w-full"
        aria-label={label}
      />
    </div>
  );
}

function PulseBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = clamp(value, 0, 10) * 10;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="uppercase tracking-widest text-white/45">{label}</span>
        <span className="font-bold tabular-nums text-white/90">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            label === "Line" ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PulseCurve({ points }: { points: { label: string; score: number }[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-center text-xs text-white/40">
        Pulse history builds as the night goes — be the first drop and set the curve.
      </div>
    );
  }
  const width = 240;
  const height = 56;
  const max = Math.max(...points.map((p) => p.score), 10);
  const min = Math.min(...points.map((p) => p.score), 0);
  const range = Math.max(2, max - min);
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: i * step,
    y: height - 6 - ((p.score - min) / range) * (height - 14),
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" role="img" aria-label="Vibe over the last hours">
        <path d={area} fill="url(#pulseGradient)" opacity={0.35} />
        <path d={line} fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <defs>
          <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-[10px] text-white/40">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export function LiveAtmospherePanel({ eventId, venueId, eventSlug, initialScore, pulse, crowdCount = 0, ended = false }: LiveAtmospherePanelProps) {
  const [score, setScore] = useState(initialScore);
  const [draft, setDraft] = useState({
    music: pulse ? clamp(Math.round(pulse.music ?? 6), 1, 10) : 6,
    crowd: pulse ? clamp(Math.round(pulse.crowd ?? 6), 1, 10) : 6,
    line: pulse ? clamp(Math.round(pulse.line ?? 4), 1, 10) : 4,
    overall: clamp(Math.round(pulse?.overall ?? initialScore), 1, 10),
  });

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const onPayload = useCallback((payload: { new?: EventRow }) => {
    const next = payload.new?.atmosphere_rating;
    if (typeof next === "number" && !Number.isNaN(next)) setScore(next);
  }, []);

  useSupabaseRealtime<EventRow>(supabase, "events", `id=eq.${eventId}`, onPayload);

  const overall = pulse?.overall ?? score;
  const pct = clamp(overall, 0, 10) * 10;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-zinc-950/80 to-violet-950/30">
      {/* Header / score */}
      <div className="relative border-b border-white/[0.07] p-5">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="flex items-center gap-2">
          <Radio className={cn("h-4 w-4", ended ? "text-white/30" : "text-emerald-400")} />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">NEYA Pulse</p>
          {ended ? (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Ended
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
              />
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-white">{overall > 0 ? overall.toFixed(1) : "—"}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight text-white">Overall vibe</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">Drops from the room, averaged live.</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
              {pulse && pulse.samples > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                  <Radio className="h-3 w-3" /> {pulse.samples} {pulse.samples === 1 ? "pulse" : "pulses"}
                </span>
              ) : null}
              {crowdCount > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
                  <Users className="h-3 w-3" /> {crowdCount} here now
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dimension bars — only when the backend has real values */}
        {(pulse?.music != null || pulse?.crowd != null || pulse?.line != null) ? (
          <div className="mt-4 grid gap-2.5">
            <PulseBar label="Music" value={pulse?.music} />
            <PulseBar label="Crowd" value={pulse?.crowd} />
            <PulseBar label="Line" value={pulse?.line} />
          </div>
        ) : null}

        {pulse?.hourly.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Vibe · last few hours</p>
            <div className="mt-2">
              <PulseCurve points={pulse.hourly} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Drop your pulse — only meaningful while the night is happening */}
      <div className="p-5">
        {ended ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">This night has ended</p>
            <p className="mt-1 text-xs text-white/50">The vibe above is the room’s final read. See you at the next one.</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Drop your pulse</p>
            <p className="mt-1 text-xs text-white/50">How’s the room right now?</p>

            <form action={submitAtmosphereReview} className="mt-4 space-y-4">
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="venue_id" value={venueId} />
          <input type="hidden" name="event_slug" value={eventSlug} />
          <input type="hidden" name="music_quality" value={draft.music} />
          <input type="hidden" name="crowd_energy" value={draft.crowd} />
          <input type="hidden" name="line_wait" value={draft.line} />
          <input type="hidden" name="overall_vibe" value={draft.overall} />

          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow label="Music" icon="🎵" value={draft.music} onChange={(v) => setDraft((d) => ({ ...d, music: v }))} />
            <SliderRow label="Crowd" icon="👥" value={draft.crowd} onChange={(v) => setDraft((d) => ({ ...d, crowd: v }))} />
            <SliderRow label="Line" icon="🚶" value={draft.line} onChange={(v) => setDraft((d) => ({ ...d, line: v }))} accent="bg-amber-300" />
            <SliderRow label="Overall" icon="🔥" value={draft.overall} onChange={(v) => setDraft((d) => ({ ...d, overall: v }))} accent="bg-fuchsia-400" />
          </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-white/40">Line higher means longer wait.</p>
              <SubmitButton pendingText="Sending pulse…" className={cn("font-bold hover:brightness-110", neyaPrimaryGradient)}>
                Submit pulse 🔥
              </SubmitButton>
            </div>
          </form>
          </>
        )}
      </div>
    </div>
  );
}