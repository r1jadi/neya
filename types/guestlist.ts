export const GUESTLIST_STATUSES = ["pending", "approved", "rejected", "checked_in"] as const;
export type GuestlistRequestStatus = (typeof GUESTLIST_STATUSES)[number];

export type GuestlistConfig = {
  id: string;
  eventId: string;
  name: string;
  capacity: number | null;
  isVip: boolean;
  isOpen: boolean;
  requiresManualApproval: boolean;
};

export type GuestlistAvailability = {
  isOpen: boolean;
  isFull: boolean;
  capacity: number | null;
  spotsUsed: number;
  spotsLeft: number | null;
  requiresManualApproval: boolean;
};

export type GuestlistRequestRow = {
  id: string;
  event_id: string;
  guestlist_id: string | null;
  user_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string | null;
  group_size: number;
  notes: string | null;
  status: GuestlistRequestStatus;
  created_at: string;
  updated_at: string;
  checked_in_at: string | null;
  approved_by: string | null;
};

export type GuestlistRequestWithEvent = GuestlistRequestRow & {
  events: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

export type GuestlistEntryRow = {
  id: string;
  guestlist_id: string;
  guestlist_request_id: string | null;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  group_size: number | null;
  status: string;
  contact: string | null;
  created_at: string;
  guestlists: {
    id: string;
    name: string;
    event_id: string;
    events:
      | { id: string; title: string; slug: string; starts_at: string | null }
      | { id: string; title: string; slug: string; starts_at: string | null }[]
      | null;
  } | {
    id: string;
    name: string;
    event_id: string;
    events:
      | { id: string; title: string; slug: string; starts_at: string | null }
      | { id: string; title: string; slug: string; starts_at: string | null }[]
      | null;
  }[] | null;
};

export type SubmitGuestlistResult =
  | { success: true }
  | { success: false; error: string; code?: "full" | "closed" | "duplicate" | "invalid" | "server" };
