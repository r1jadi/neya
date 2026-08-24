import { createAdminClient } from "@/lib/supabase/admin";

export interface EventSocialCounts {
  /** Number of users who saved this event (saved_events rows). */
  saved: number;
  /** Number of paid ticket orders for this event. */
  going: number;
}

/**
 * Real social-proof counts for a single event. Both numbers come straight
 * from the database (saved_events bookmarks and paid ticket_orders) — never
 * fabricated. Returns zeros when the event isn't a UUID or the query fails.
 */
export async function getEventSocialCounts(eventId: string): Promise<EventSocialCounts> {
  if (!eventId) return { saved: 0, going: 0 };
  try {
    const admin = createAdminClient();
    const [savedRes, goingRes] = await Promise.all([
      admin
        .from("saved_events")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      admin
        .from("ticket_orders")
        .select("id, tickets(event_id)", { count: "exact", head: true })
        .eq("tickets.event_id", eventId)
        .eq("payment_status", "paid"),
    ]);
    return {
      saved: savedRes.count ?? 0,
      going: goingRes.count ?? 0,
    };
  } catch (error) {
    console.error("[neya] getEventSocialCounts", error);
    return { saved: 0, going: 0 };
  }
}