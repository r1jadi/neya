import { isHappeningNow, isPast } from "@/lib/event-dates";

export type EventLifecycle = "live" | "upcoming" | "ended";

export type SubmissionState =
  | "draft"
  | "submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

/** Clock-based state of an event: live / upcoming / ended. */
export function eventLifecycle(
  startsAt: string,
  endsAt?: string | null,
  now = new Date(),
): EventLifecycle {
  if (isHappeningNow(startsAt, endsAt, now)) return "live";
  if (isPast(startsAt, endsAt ?? undefined, now)) return "ended";
  return "upcoming";
}

/** The moderation pipeline state of an event (authoritative backend value). */
export function submissionState(
  submission_status?: string | null,
  is_listed_public?: boolean,
): SubmissionState {
  const s = (submission_status ?? "").toLowerCase().trim();
  if (s === "published") return "published";
  if (s === "rejected") return "rejected";
  if (s === "archived") return "archived";
  if (s === "approved") return "approved";
  if (s === "submitted") return "submitted";
  if (s === "pending_review") return "pending_review";
  if (s === "draft") return "draft";
  return is_listed_public ? "published" : "pending_review";
}

export type EventStatusBadge = {
  label: string;
  tone: "green" | "amber" | "sky" | "red" | "muted" | "violet";
  icon: string;
};

/**
 * Combined badge for an organizer: the moderation pipeline state wins when it
 * needs attention (rejected / draft / pending review); otherwise we show the
 * clock-based lifecycle so an organizer instantly sees what's live, upcoming,
 * or over. Text + icon only — never rely on color alone.
 */
export function eventStatusBadge(opts: {
  starts_at: string;
  ends_at?: string | null;
  submission_status?: string | null;
  is_listed_public?: boolean;
  now?: Date;
}): EventStatusBadge {
  const state = submissionState(opts.submission_status, opts.is_listed_public);

  if (state === "rejected") return { label: "Rejected", tone: "red", icon: "✕" };
  if (state === "draft") return { label: "Draft", tone: "muted", icon: "•" };
  if (state === "submitted" || state === "pending_review") {
    return { label: "Pending review", tone: "amber", icon: "⏳" };
  }
  if (state === "archived") return { label: "Archived", tone: "muted", icon: "🗄" };

  // published or approved — surface the live lifecycle.
  const lc = eventLifecycle(opts.starts_at, opts.ends_at, opts.now);
  if (lc === "live") return { label: "Live now", tone: "green", icon: "🔴" };
  if (lc === "ended") return { label: "Ended", tone: "muted", icon: "✓" };
  if (state === "approved") return { label: "Approved · Upcoming", tone: "sky", icon: "✓" };
  return { label: "Upcoming", tone: "sky", icon: "✓" };
}
