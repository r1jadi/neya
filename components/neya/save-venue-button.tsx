"use client";
import { Bookmark } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSaveVenue } from "@/actions/saved-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
export function SaveVenueButton({
  venueId,
  venueSlug,
  initialSaved = false,
  className,
}: {
  venueId: string;
  venueSlug: string;
  initialSaved?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const router = useRouter();

  function toggle() {
    if (pending || inFlight.current) return;
    inFlight.current = true;
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const form = new FormData();
      form.set("venue_id", venueId);
      form.set("venue_slug", venueSlug);
      try {
        const result = await toggleSaveVenue(form);
        setSaved(result.saved);
        router.refresh();
      } catch {
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
      className={cn("gap-1.5", className)}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t.actions.removeFromMyNight : t.actions.save}
    >
      <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
      {pending ? "…" : saved ? t.actions.saved : t.actions.save}
    </Button>
  );
}
