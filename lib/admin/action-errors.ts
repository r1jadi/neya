/** Map internal error codes to admin UI copy. */
export function adminErrorMessage(code: string | undefined, detail?: string | null): string {
  const d = detail?.trim();
  switch (code) {
    case "fields":
      return "Fill in all required fields.";
    case "venue":
      return "Selected venue was not found.";
    case "duplicate":
      return "An account with this email already exists.";
    case "create":
      return "Could not create the auth user. Check Supabase Auth settings.";
    case "profile":
      return d
        ? `Could not save the venue profile: ${d}`
        : "Could not save the venue profile. Run latest DB migrations (venue role columns + profile trigger fix).";
    case "profile_venue_taken":
      return "This venue already has an active partner account.";
    case "update":
      return d ? `Update failed: ${d}` : "Update failed. Check permissions and try again.";
    case "delete":
      return "Could not delete this account.";
    case "reset":
      return "Could not send password reset email.";
    case "password":
      return "Password must be at least 8 characters.";
    case "missing":
      return "Record not found.";
    case "invalid":
      return "Invalid request.";
    case "full":
      return "Guestlist is full — cannot approve more guests.";
    case "guestlist_update":
      return d ? `Guestlist update failed: ${d}` : "Guestlist update failed.";
    case "guestlist_missing":
      return "Guestlist request not found.";
    default:
      return code ? `Something went wrong (${code}).` : "Something went wrong.";
  }
}

export function withQueryParam(path: string, query: string): string {
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
