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

interface ReservationModalProps {
  venueName: string;
  trigger?: React.ReactNode;
}

export function ReservationModal({ venueName, trigger }: ReservationModalProps) {
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
            Instant hold with deposit. Venue confirms via chat — powered by Stripe in production.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Input placeholder="Full name" autoComplete="name" />
          <Input placeholder="Phone" type="tel" autoComplete="tel" />
          <Input placeholder="Guests" inputMode="numeric" />
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
