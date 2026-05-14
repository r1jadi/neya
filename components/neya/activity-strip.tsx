import type { ActivityFeedItem } from "@/services/activity";

function line(item: ActivityFeedItem): string {
  switch (item.verb) {
    case "joined_guestlist":
      return "Someone joined a guestlist";
    case "checked_in":
      return "Someone checked in at a venue";
    case "bought_ticket":
      return "A ticket was purchased";
    case "confirmed_table":
      return "A table deposit cleared";
    case "pulse_vote":
      return "Live atmosphere pulse dropped";
    default:
      return "Nightlife activity";
  }
}

export function ActivityStrip({ items }: { items: ActivityFeedItem[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl space-y-3 px-4 pb-10 sm:px-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">Live feed</h2>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/75 sm:text-sm"
          >
            <span className="text-fuchsia-200/90">●</span> {line(item)}
            <span className="ml-2 text-white/35">{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
