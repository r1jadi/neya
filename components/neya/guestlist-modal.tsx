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

interface GuestlistModalProps {
  eventTitle: string;
  trigger?: React.ReactNode;
}

export function GuestlistModal({ eventTitle, trigger }: GuestlistModalProps) {
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
            Apply for entry. If approved, you receive a QR — VIP lists can be invite-only.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Input placeholder="Full name" />
          <Input placeholder="Instagram / phone" />
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Request access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
