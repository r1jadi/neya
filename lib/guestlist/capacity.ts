import type { GuestlistAvailability } from "@/types/guestlist";

/** Headcount that counts toward capacity (pending holds a spot until rejected). */
export function countSpotsUsed(
  rows: { group_size: number; status: string }[],
  includePending = true,
): number {
  const statuses = includePending
    ? new Set(["pending", "approved", "checked_in"])
    : new Set(["approved", "checked_in"]);
  return rows.reduce((sum, r) => (statuses.has(r.status) ? sum + (r.group_size ?? 1) : sum), 0);
}

export function resolveGuestlistAvailability(
  config: { capacity: number | null; isOpen: boolean; requiresManualApproval: boolean },
  spotsUsed: number,
): GuestlistAvailability {
  const capacity = config.capacity;
  const spotsLeft = capacity != null ? Math.max(0, capacity - spotsUsed) : null;
  const isFull = capacity != null && spotsUsed >= capacity;

  return {
    isOpen: config.isOpen && !isFull,
    isFull,
    capacity,
    spotsUsed,
    spotsLeft,
    requiresManualApproval: config.requiresManualApproval,
  };
}

export function guestlistAvailabilityLabel(availability: GuestlistAvailability): string {
  if (!availability.isOpen && availability.isFull) return "Guestlist full";
  if (availability.spotsLeft != null && availability.spotsLeft > 0 && availability.spotsLeft <= 10) {
    return `${availability.spotsLeft} spot${availability.spotsLeft === 1 ? "" : "s"} left`;
  }
  if (availability.isOpen) return "Guestlist open";
  return "Guestlist closed";
}
