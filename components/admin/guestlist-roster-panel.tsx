"use client";

import { useMemo } from "react";
import type { AdminEventRow } from "@/services/admin";
import type { GuestlistRequestWithEvent } from "@/types/guestlist";
import { guestlistStatusClass, guestlistStatusLabel } from "@/lib/guestlist/labels";
import { cn } from "@/lib/utils";

function eventTitle(r: GuestlistRequestWithEvent, events: AdminEventRow[]): string {
  const ev = r.events;
  if (Array.isArray(ev)) return ev[0]?.title ?? "Event";
  if (ev?.title) return ev.title;
  return events.find((e) => e.id === r.event_id)?.title ?? "Event";
}

type Props = {
  /** Approved / checked-in requests — source of truth for the door list */
  approvedRequests: GuestlistRequestWithEvent[];
  events: AdminEventRow[];
  eventFilter?: string;
};

export function GuestlistRosterPanel({ approvedRequests, events, eventFilter = "" }: Props) {
  const filtered = useMemo(() => {
    let rows = approvedRequests;
    if (eventFilter) rows = rows.filter((r) => r.event_id === eventFilter);
    return rows;
  }, [approvedRequests, eventFilter]);

  const byEvent = useMemo(() => {
    const map = new Map<string, { title: string; rows: GuestlistRequestWithEvent[] }>();
    for (const r of filtered) {
      const title = eventTitle(r, events);
      const bucket = map.get(r.event_id) ?? { title, rows: [] };
      bucket.rows.push(r);
      map.set(r.event_id, bucket);
    }
    return [...map.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [filtered, events]);

  const totalGuests = filtered.reduce((sum, r) => sum + (r.group_size ?? 1), 0);

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Approved guestlist (door list)</h3>
        <p className="text-xs text-white/45">
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · {totalGuests} guest
          {totalGuests === 1 ? "" : "s"} on list
        </p>
      </div>

      {!filtered.length ? (
        <p className="text-sm text-white/40">
          No approved guests yet. Use <strong className="text-white/60">Approve</strong> on a pending request above.
        </p>
      ) : (
        <div className="space-y-4">
          {byEvent.map(([eventId, group]) => (
            <div key={eventId}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300/90">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{r.full_name}</p>
                      <p className="text-xs text-white/50">
                        {r.phone}
                        {r.email ? ` · ${r.email}` : ""} · party of {r.group_size}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        guestlistStatusClass(r.status),
                      )}
                    >
                      {guestlistStatusLabel(r.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
