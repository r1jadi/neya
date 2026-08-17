"use client";

import { CalendarPlus } from "lucide-react";
import type { Event } from "@/types";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A local .ics download keeps calendar integration private and provider-neutral. */
export function AddToCalendarButton({ event, className = "" }: { event: Event; className?: string }) {
  function downloadCalendar() {
    const start = icsDate(event.starts_at);
    const end = icsDate(event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 4 * 60 * 60 * 1000).toISOString());
    const location = [event.venue?.name, event.venue?.address].filter(Boolean).join(", ");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEYA//Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${event.id}@neya.events`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs([event.description, `Discover on NEYA: /events/${event.slug}`].filter(Boolean).join("\n\n"))}`,
      "END:VEVENT", "END:VCALENDAR",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${event.slug || "neya-event"}.ics`; anchor.click();
    URL.revokeObjectURL(url);
  }
  return <button type="button" onClick={downloadCalendar} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/75 transition hover:border-sky-400/40 hover:text-white ${className}`}><CalendarPlus className="h-4 w-4" />Add to calendar</button>;
}
