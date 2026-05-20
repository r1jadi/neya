"use client";

import { useMemo } from "react";
import type { AdminEventRow } from "@/services/admin";
import type { GuestlistEntryRow } from "@/types/guestlist";
import { guestlistStatusLabel } from "@/lib/guestlist/labels";
import { cn } from "@/lib/utils";

function eventFromEntry(e: GuestlistEntryRow) {
  const gl = e.guestlists;
  const guestlist = Array.isArray(gl) ? gl[0] : gl;
  const ev = guestlist?.events;
  return Array.isArray(ev) ? ev[0] : ev;
}

function guestlistName(e: GuestlistEntryRow): string {
  const gl = e.guestlists;
  const guestlist = Array.isArray(gl) ? gl[0] : gl;
  return guestlist?.name ?? "Guestlist";
}

type Props = {
  entries: GuestlistEntryRow[];
  events: AdminEventRow[];
  eventFilter?: string;
};

export function GuestlistRosterPanel({ entries, events, eventFilter = "" }: Props) {
  const filtered = useMemo(() => {
    if (!eventFilter) return entries;
    return entries.filter((e) => {
      const gl = e.guestlists;
      const guestlist = Array.isArray(gl) ? gl[0] : gl;
      return guestlist?.event_id === eventFilter;
    });
  }, [entries, eventFilter]);

  const byEvent = useMemo(() => {
    const map = new Map<string, { title: string; entries: GuestlistEntryRow[] }>();
    for (const e of filtered) {
      const ev = eventFromEntry(e);
      const eventId = ev?.id ?? "unknown";
      const title = ev?.title ?? events.find((x) => x.id === eventId)?.title ?? "Event";
      const bucket = map.get(eventId) ?? { title, entries: [] };
      bucket.entries.push(e);
      map.set(eventId, bucket);
    }
    return [...map.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [filtered, events]);

  const totalGuests = filtered.reduce((sum, e) => sum + (e.group_size ?? 1), 0);

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
          No approved guests yet. Approving a request adds them here automatically.
        </p>
      ) : (
        <div className="space-y-4">
          {byEvent.map(([eventId, group]) => (
            <div key={eventId}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300/90">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{e.full_name ?? e.contact ?? "Guest"}</p>
                      <p className="text-xs text-white/50">
                        {e.phone ?? e.contact} · party of {e.group_size ?? 1} · {guestlistName(e)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                      )}
                    >
                      {guestlistStatusLabel("approved")}
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
