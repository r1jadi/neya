"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import { submitGuestlistRequest } from "@/actions/guestlist";
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
import type { GuestlistAvailability, GuestlistConfig } from "@/types/guestlist";
import { cn } from "@/lib/utils";

interface GuestlistModalProps {
  eventTitle: string;
  eventId: string;
  guestlist: GuestlistConfig;
  availability: GuestlistAvailability;
  trigger?: React.ReactNode;
}

const inputClass =
  "flex min-h-[44px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40";

export function GuestlistModal({
  eventTitle,
  eventId,
  guestlist,
  availability,
  trigger,
}: GuestlistModalProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = availability.isOpen && !availability.isFull;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSubmitted(false);
      setError(null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitGuestlistRequest(formData);
      if (result.success) {
        setSubmitted(true);
        return;
      }
      setError(result.error);
    });
  }

  const defaultTrigger = (
    <button
      type="button"
      disabled={!canSubmit}
      className={cn(
        "w-full rounded-xl border py-3 text-sm font-semibold transition",
        canSubmit
          ? "border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 text-white hover:border-fuchsia-400/60 hover:from-fuchsia-600/30"
          : "cursor-not-allowed border-white/10 bg-white/5 text-white/35",
      )}
    >
      {availability.isFull ? "Guestlist full" : "Join guestlist"}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-zinc-950 sm:max-w-md">
        {submitted ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold text-white">
              Request submitted
            </h3>
            <p className="mt-2 text-sm text-white/60">
              You&apos;ll be notified once approved. Show your phone at the door.
            </p>
            <Button type="button" className="mt-6 w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-[family-name:var(--font-display)]">Join guestlist</DialogTitle>
              <DialogDescription>
                {eventTitle}
                {guestlist.name ? ` · ${guestlist.name}` : ""}
                {availability.spotsLeft != null && availability.spotsLeft <= 15 ? (
                  <span className="mt-1 block text-fuchsia-300/90">
                    {availability.spotsLeft} spot{availability.spotsLeft === 1 ? "" : "s"} left
                  </span>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            {!canSubmit ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {availability.isFull ? "This guestlist is full." : "Guestlist is closed."}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-3 py-1">
                <input type="hidden" name="event_id" value={eventId} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-white/45">First name</label>
                    <Input name="first_name" required autoComplete="given-name" maxLength={80} className="h-11" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/45">Last name</label>
                    <Input name="last_name" required autoComplete="family-name" maxLength={80} className="h-11" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Phone</label>
                  <Input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+383 44 …"
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Email (optional)</label>
                  <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" className="h-11" />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-white/45">
                    <Users className="h-3 w-3" />
                    Group size
                  </label>
                  <Input
                    name="group_size"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={1}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/45">Note (optional)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    maxLength={500}
                    placeholder="Birthday, +1 name, arrival time…"
                    className={inputClass}
                  />
                </div>
                {guestlist.requiresManualApproval ? (
                  <p className="text-xs text-white/40">Requests are reviewed by the venue team.</p>
                ) : null}
                {error ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
                <DialogFooter className="gap-2 pt-1 sm:gap-0">
                  <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending} className="min-w-[120px]">
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Request entry"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
