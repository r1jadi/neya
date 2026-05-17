"use client";

import { useCallback, useMemo, useState } from "react";
import { submitAtmosphereReview } from "@/actions/atmosphere";
import { AtmosphereMeter } from "@/components/neya/atmosphere-meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import { createClient } from "@/lib/supabase/client";

type EventRow = { atmosphere_rating?: number };

interface LiveAtmospherePanelProps {
  eventId: string;
  venueId: string;
  eventSlug: string;
  initialScore: number;
}

export function LiveAtmospherePanel({ eventId, venueId, eventSlug, initialScore }: LiveAtmospherePanelProps) {
  const [score, setScore] = useState(initialScore);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const onPayload = useCallback(
    (payload: { new?: EventRow }) => {
      const next = payload.new?.atmosphere_rating;
      if (typeof next === "number" && !Number.isNaN(next)) setScore(next);
    },
    [],
  );

  useSupabaseRealtime<EventRow>(supabase, "events", `id=eq.${eventId}`, onPayload);

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <AtmosphereMeter score={score} />
      <p className="text-xs text-white/50">
        Drop a live pulse — your vote updates the vibe score for everyone on this event.
      </p>
      <form action={submitAtmosphereReview} className="grid gap-3">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="venue_id" value={venueId} />
        <input type="hidden" name="event_slug" value={eventSlug} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-white/60">
            Music
            <Input name="music_quality" type="number" min={1} max={10} placeholder="1–10" className="mt-1" />
          </label>
          <label className="text-xs text-white/60">
            Crowd
            <Input name="crowd_energy" type="number" min={1} max={10} placeholder="1–10" className="mt-1" />
          </label>
          <label className="text-xs text-white/60">
            Line
            <Input name="line_wait" type="number" min={1} max={10} placeholder="1–10" className="mt-1" />
          </label>
          <label className="text-xs text-white/60">
            Overall vibe <span className="text-fuchsia-300">*</span>
            <Input name="overall_vibe" type="number" min={1} max={10} required placeholder="1–10" className="mt-1" />
          </label>
        </div>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Submit pulse
        </Button>
      </form>
    </div>
  );
}
