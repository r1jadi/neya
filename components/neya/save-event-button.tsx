"use client";

import { Bookmark } from "lucide-react";
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
  return (
    <form
      action={toggleSaveEvent}
      className={cn("w-full sm:inline-flex sm:w-auto", className)}
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_slug" value={eventSlug} />
      <Button type="submit" size="sm" variant={initialSaved ? "default" : "secondary"} className="w-full gap-1.5 sm:w-auto">
        <Bookmark className={cn("h-3.5 w-3.5", initialSaved && "fill-current")} />
        {initialSaved ? "Saved" : "Save"}
      </Button>
    </form>
  );
}
