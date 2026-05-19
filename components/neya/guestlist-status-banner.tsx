import { guestlistAvailabilityLabel } from "@/lib/guestlist/capacity";
import type { GuestlistAvailability, GuestlistConfig } from "@/types/guestlist";
import { cn } from "@/lib/utils";

type GuestlistStatusBannerProps = {
  guestlist: GuestlistConfig;
  availability: GuestlistAvailability;
  className?: string;
};

export function GuestlistStatusBanner({ guestlist, availability, className }: GuestlistStatusBannerProps) {
  const label = guestlistAvailabilityLabel(availability);
  const isFull = availability.isFull;
  const isOpen = availability.isOpen;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        isFull
          ? "border-red-500/25 bg-red-500/10 text-red-100"
          : isOpen
            ? "border-fuchsia-500/25 bg-fuchsia-500/5 text-fuchsia-100"
            : "border-white/10 bg-white/[0.03] text-white/55",
        className,
      )}
    >
      <p className="font-medium">{label}</p>
      {guestlist.requiresManualApproval ? (
        <p className="mt-1 text-xs text-white/50">Guestlist requests are manually reviewed.</p>
      ) : (
        <p className="mt-1 text-xs text-white/50">Submit your details — approval is automatic when spots allow.</p>
      )}
      {guestlist.isVip ? (
        <p className="mt-1 text-xs font-medium text-amber-200/90">VIP guestlist</p>
      ) : null}
    </div>
  );
}
