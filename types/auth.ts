export type UserRole = "user" | "venue" | "admin";

export type UserProfile = {
  id: string;
  display_name: string | null;
  role: UserRole;
  venue_id: string | null;
  account_active: boolean;
  is_admin: boolean;
  is_premium: boolean;
  onboarding_complete: boolean;
};

export type VenueAccountRow = {
  id: string;
  email: string;
  display_name: string | null;
  venue_id: string | null;
  account_active: boolean;
  created_at: string;
  venues: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
};
