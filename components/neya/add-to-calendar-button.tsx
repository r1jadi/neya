"use client";

import { CalendarPlus, ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/types";
import { trackDiscoveryMetric } from "@/actions/discovery-analytics";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Provider-neutral ICS plus Google Calendar, using only fields actually stored on the event. */
export function AddToCalendarButton({ event, className = "" }: { event: Event; className?: string }) {
  const [open, setOpen] = useState(false);
  function downloadCalendar() {
    const start = icsDate(event.starts_at);
    const location = [event.venue?.name ?? event.venue_name, event.venue?.address].filter(Boolean).join(", ");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEYA//Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${event.id}@neya.events`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${start}`,
      ...(event.ends_at ? [`DTEND:${icsDate(event.ends_at)}`] : []),
      `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs([event.description, `Discover on NEYA: /events/${event.slug}`].filter(Boolean).join("\n\n"))}`,
      "END:VEVENT", "END:VCALENDAR",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${event.slug || "neya-event"}.ics`; anchor.click();
    URL.revokeObjectURL(url);
  }
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE"); google.searchParams.set("text", event.title); google.searchParams.set("dates", `${icsDate(event.starts_at)}${event.ends_at ? `/${icsDate(event.ends_at)}` : ""}`);
  const location = [event.venue?.name ?? event.venue_name, event.venue?.address].filter(Boolean).join(", "); if (location) google.searchParams.set("location", location); if (event.description) google.searchParams.set("details", event.description);
  return <div className={`relative ${className}`}><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/75 transition hover:border-sky-400/40 hover:text-white"><CalendarPlus className="h-4 w-4" />Add to calendar<ChevronDown className="h-3.5 w-3.5" /></button>{open ? <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl"><a href={google.toString()} target="_blank" rel="noopener noreferrer" onClick={() => { void trackDiscoveryMetric("calendar_add", { eventId: event.id, dimensions: { provider: "google" } }); setOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"><CalendarPlus className="h-4 w-4 text-sky-300" />Google Calendar</a><button type="button" onClick={() => { void trackDiscoveryMetric("calendar_add", { eventId: event.id, dimensions: { provider: "ics" } }); downloadCalendar(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"><Download className="h-4 w-4 text-sky-300" />Download ICS <span className="ml-auto text-xs text-white/40">Apple · Outlook</span></button></div> : null}</div>;
}
