import type { GuestlistRequestStatus } from "@/types/guestlist";

const STATUS_LABELS: Record<GuestlistRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  checked_in: "Checked in",
};

export function guestlistStatusLabel(status: string): string {
  return STATUS_LABELS[status as GuestlistRequestStatus] ?? status;
}

export function guestlistStatusClass(status: string): string {
  switch (status) {
    case "approved":
      return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
    case "rejected":
      return "text-red-300 bg-red-500/15 border-red-500/30";
    case "checked_in":
      return "text-sky-300 bg-sky-500/15 border-sky-500/30";
    default:
      return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  }
}
