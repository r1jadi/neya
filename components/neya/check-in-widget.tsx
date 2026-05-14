"use client";

import { checkInAtVenue } from "@/actions/checkin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CheckInWidgetProps {
  venueId: string;
  venueSlug: string;
  publicCount: number;
}

export function CheckInWidget({ venueId, venueSlug, publicCount }: CheckInWidgetProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-medium text-white">Who&apos;s here tonight</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-sky-300">{publicCount}</p>
      <p className="text-xs text-white/45">Public check-ins in the last ~18h (opt-in).</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-4 w-full" variant="default" type="button">
            Check in
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check in</DialogTitle>
            <DialogDescription>
              Public check-ins count toward the live counter. Private stays on your account only.
            </DialogDescription>
          </DialogHeader>
          <form action={checkInAtVenue} className="grid gap-3 py-2">
            <input type="hidden" name="venue_id" value={venueId} />
            <input type="hidden" name="venue_slug" value={venueSlug} />
            <label className="text-sm text-white/70">
              Visibility
              <select
                name="visibility"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                defaultValue="public"
              >
                <option value="public">Public — count me in the room</option>
                <option value="friends">Friends (stored; feed coming soon)</option>
                <option value="private">Private — not on counters</option>
              </select>
            </label>
            <DialogFooter>
              <Button type="submit">Confirm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
