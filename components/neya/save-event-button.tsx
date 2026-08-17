"use client";

import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toggleSaveEvent } from "@/actions/saved-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveEventButton({
  eventId,
  eventSlug,
  initialSaved,
  className,
}: {
  eventId: string;
  eventSlug: string;
  initialSaved: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleToggle() {
    if (pending || inFlight.current) return;
    inFlight.current = true;
    const next = !saved;
    setSaved(next); // optimistic — no page jump, no waiting on the server
    startTransition(async () => {
      const formData = new FormData();
      formData.set("event_id", eventId);
      formData.set("event_slug", eventSlug);
      try {
        const result = await toggleSaveEvent(formData);
        setSaved(result.saved);
        // Sync server-rendered state (dashboard counts, event page badge).
        router.refresh();
      } catch {
        // A guest redirect (NEXT_REDIRECT) navigates to /login; a real
        // failure just reverts the optimistic state.
        setSaved(!next);
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={saved ? "default" : "secondary"}
      className={cn("w-full gap-1.5 sm:w-auto", className)}
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved events" : "Save event"}
    >
      <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
      {pending ? "…" : saved ? "Saved" : "Save"}
    </Button>
  );
}
