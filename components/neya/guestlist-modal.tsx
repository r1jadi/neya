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
import { applyGuestlist } from "@/actions/bookings";

interface GuestlistModalProps {
  eventTitle: string;
  guestlistId: string;
  trigger?: React.ReactNode;
}

export function GuestlistModal({ eventTitle, guestlistId, trigger }: GuestlistModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="secondary">Join guestlist</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guestlist — {eventTitle}</DialogTitle>
          <DialogDescription>
            Request access with your Instagram or phone. You must be logged in.
          </DialogDescription>
        </DialogHeader>
        <form action={applyGuestlist} className="grid gap-3 py-2">
          <input type="hidden" name="guestlist_id" value={guestlistId} />
          <Input name="contact" placeholder="Instagram or phone" required maxLength={280} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit">Request access</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
