"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useMyNight } from "@/components/my-night/my-night-provider";
import { Button } from "@/components/ui/button";
import { MAX_NIGHT_STOPS } from "@/lib/my-night/logic";
import type { NightStopDisplay } from "@/types";

export function ReusePlanButton({ stops }: { stops: NightStopDisplay[] }) {
  const { stops: mine, addStop, hydrated } = useMyNight();
  const [state, setState] = useState<"idle" | "added" | "full" | "waiting">("idle");

  async function handleAdd() {
    if (!hydrated) return;
    let added = 0;
    const mineRefs = new Set(mine.map((s) => `${s.kind}:${s.refId}`));
    for (const stop of stops) {
      if (!stop.available) continue;
      if (mine.length + added >= MAX_NIGHT_STOPS) break;
      if (mineRefs.has(`${stop.kind}:${stop.refId}`)) continue;
      addStop(stop);
      mineRefs.add(`${stop.kind}:${stop.refId}`);
      added += 1;
    }
    if (added > 0) {
      setState("added");
    } else if (mine.length + added >= MAX_NIGHT_STOPS) {
      setState("full");
    } else {
      setState("idle");
    }
    window.setTimeout(() => setState("idle"), 3000);
  }

  if (state === "added") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">
          <Check className="h-4 w-4" /> Added to your night
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/my-night">Open My Night →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={handleAdd} disabled={state === "waiting"}>
        <Plus className="h-4 w-4" />
        {state === "full" ? "Your night is full (3 stops)" : "Add this plan to My Night"}
      </Button>
      <Button asChild size="sm" variant="secondary">
        <Link href="/my-night">Open My Night →</Link>
      </Button>
    </div>
  );
}
