"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReservationCheckout } from "@/actions/bookings";

interface ReservationModalProps {
  venueName: string;
  venueId: string;
  eventId?: string | null;
  trigger?: React.ReactNode;
}

export function ReservationModal({ venueName, venueId, eventId, trigger }: ReservationModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="default">Reserve table</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Table at {venueName}</DialogTitle>
          <DialogDescription>
            €20 deposit via Stripe Checkout. You&apos;ll get a confirmation when payment succeeds.
          </DialogDescription>
        </DialogHeader>
        <form action={createReservationCheckout} className="grid gap-3 py-2">
          <input type="hidden" name="venue_id" value={venueId} />
          {eventId ? <input type="hidden" name="event_id" value={eventId} /> : null}
          <Input name="phone" placeholder="Phone" type="tel" autoComplete="tel" />
          <Input name="party_size" type="number" placeholder="Guests" defaultValue={2} min={1} max={20} />
          <Input name="notes" placeholder="Notes (optional)" maxLength={500} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Pay deposit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
