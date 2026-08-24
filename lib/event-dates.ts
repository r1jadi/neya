/** Prishtina / Kosovo — CET/CEST */
export const CITY_TZ = "Europe/Belgrade";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late_night" | "very_late";

/**
 * Deterministic time-of-day bucket in the city timezone (no AI, no clock drift
 * beyond the wall clock). Used to make discovery copy feel alive across the day.
 */
export function getTimeOfDay(now = new Date(), tz = CITY_TZ): TimeOfDay {
  const w = wallClockParts(now.getTime(), tz);
  const h = w.h;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 21) return "evening";
  if (h >= 21 || h < 2) return "late_night";
  return "very_late";
}

/** Short, time-aware line for discovery surfaces. */
export function timeOfDayCopy(now = new Date(), tz = CITY_TZ): { label: string; subline: string } {
  switch (getTimeOfDay(now, tz)) {
    case "morning":
      return { label: "What\u2019s happening tonight?", subline: "Coffee for now, plans for later — the city wakes up fast." };
    case "afternoon":
      return { label: "Plan your night.", subline: "The evening is still yours to shape — see what\u2019s on." };
    case "evening":
      return { label: "Your night starts here.", subline: "Doors are opening across the city. Pick where you\u2019re headed." };
    case "late_night":
      return { label: "Where\u2019s everyone going?", subline: "The city is moving — check the live pulse before you go out." };
    case "very_late":
      return { label: "Still going? \uD83D\uDC40", subline: "The night isn\u2019t over yet — see what\u2019s live right now." };
  }
}

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function wallClockParts(utcMs: number, tz = CITY_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const v = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { y: v("year"), m: v("month"), d: v("day"), h: v("hour"), min: v("minute") };
}

/** Admin `datetime-local` → UTC ISO for Supabase (`timestamptz`). */
export function datetimeLocalToUtcIso(local: string, tz = CITY_TZ): string | null {
  const m = DATETIME_LOCAL_RE.exec(local.trim());
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const d = +m[3];
  const h = +m[4];
  const min = +m[5];
  const desired = Date.UTC(y, mo, d, h, min, 0);

  let ts = desired;
  for (let i = 0; i < 4; i++) {
    const w = wallClockParts(ts, tz);
    const actual = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, 0);
    ts += desired - actual;
  }
  return new Date(ts).toISOString();
}

/** UTC ISO from DB → value for `datetime-local` in admin forms. */
export function utcIsoToDatetimeLocal(iso: string, tz = CITY_TZ): string {
  const w = wallClockParts(new Date(iso).getTime(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.y}-${pad(w.m)}-${pad(w.d)}T${pad(w.h)}:${pad(w.min)}`;
}

function ymdInTz(iso: string | Date, tz = CITY_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

function ymdFromParts(p: { y: number; m: number; d: number }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 0 = Sunday … 6 = Saturday (Prishtina wall clock). */
export function dayOfWeekInTz(iso: string | Date, tz = CITY_TZ): number {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const name = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" });
  const map: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return map[name] ?? 0;
}

function addCalendarDaysInTz(y: number, m: number, d: number, delta: number, tz = CITY_TZ) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const anchor = datetimeLocalToUtcIso(`${y}-${pad(m)}-${pad(d)}T12:00`, tz);
  const ms = new Date(anchor ?? 0).getTime() + delta * 86400000;
  return wallClockParts(ms, tz);
}

/** Friday–Sunday window for “this weekend” (current weekend if Fri–Sun, else the next one). */
export function getThisWeekendRange(now = new Date(), tz = CITY_TZ) {
  const w = wallClockParts(now.getTime(), tz);
  const dow = dayOfWeekInTz(now, tz);

  let fridayOffset: number;
  if (dow === 0) fridayOffset = -2;
  else if (dow === 6) fridayOffset = -1;
  else if (dow === 5) fridayOffset = 0;
  else fridayOffset = 5 - dow;

  const fri = addCalendarDaysInTz(w.y, w.m, w.d, fridayOffset, tz);
  const sun = addCalendarDaysInTz(fri.y, fri.m, fri.d, 2, tz);
  return { startYmd: ymdFromParts(fri), endYmd: ymdFromParts(sun) };
}

export function isOnThisWeekend(startsAt: string, now = new Date(), tz = CITY_TZ): boolean {
  const { startYmd, endYmd } = getThisWeekendRange(now, tz);
  const eventYmd = ymdInTz(startsAt, tz);
  return eventYmd >= startYmd && eventYmd <= endYmd;
}

export function isTonight(startsAt: string, now = new Date()): boolean {
  return ymdInTz(startsAt) === ymdInTz(now);
}

/** YYYY-MM-DD (city TZ) of the calendar day `offset` days from `now`. */
export function ymdOffsetInTz(offset: number, now = new Date(), tz = CITY_TZ): string {
  const w = wallClockParts(now.getTime(), tz);
  const target = addCalendarDaysInTz(w.y, w.m, w.d, offset, tz);
  return ymdFromParts(target);
}

export function ymdForDateInTz(iso: string, tz = CITY_TZ): string {
  return ymdInTz(iso, tz);
}

/** True when the event starts during the calendar day `offset` days from `now` (0 = today). */
export function isOnDayOffset(startsAt: string, offset: number, now = new Date()): boolean {
  return ymdInTz(startsAt, CITY_TZ) === ymdOffsetInTz(offset, now, CITY_TZ);
}

/** UTC boundaries for the current calendar day in the supplied timezone. */
export function getTodayRangeInTz(now = new Date(), tz = CITY_TZ): { start: string; end: string } {
  const wall = wallClockParts(now.getTime(), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = datetimeLocalToUtcIso(`${wall.y}-${pad(wall.m)}-${pad(wall.d)}T00:00`, tz);
  const tomorrow = addCalendarDaysInTz(wall.y, wall.m, wall.d, 1, tz);
  const end = datetimeLocalToUtcIso(`${tomorrow.y}-${pad(tomorrow.m)}-${pad(tomorrow.d)}T00:00`, tz);
  if (!start || !end) throw new Error("Could not determine today range");
  return { start, end };
}

export function isUpcoming(startsAt: string, now = new Date()): boolean {
  return new Date(startsAt).getTime() > now.getTime();
}

export function isPast(startsAt: string, endsAt: string | undefined, now = new Date()): boolean {
  const end = endsAt ? new Date(endsAt).getTime() : new Date(startsAt).getTime() + 8 * 3600000;
  return end < now.getTime();
}

/** Event has started and not ended (default 8h window if no ends_at). */
export function isHappeningNow(
  startsAt: string,
  endsAt?: string | null,
  now = new Date(),
): boolean {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 8 * 3600000;
  const t = now.getTime();
  return t >= start && t <= end;
}

export function formatEventWhen(startsAt: string, now = new Date()): string {
  const start = new Date(startsAt);
  if (isTonight(startsAt, now)) {
    const time = start.toLocaleTimeString("en-GB", {
      timeZone: CITY_TZ,
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isHappeningNow(startsAt, null, now)) return `Live now · until late`;
    return `Tonight · ${time}`;
  }

  const ms = start.getTime() - now.getTime();
  const days = Math.ceil(ms / 86400000);
  if (days === 1) {
    const time = start.toLocaleTimeString("en-GB", {
      timeZone: CITY_TZ,
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Tomorrow · ${time}`;
  }
  if (days > 1 && days <= 7) {
    return start.toLocaleDateString("en-GB", {
      timeZone: CITY_TZ,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return start.toLocaleDateString("en-GB", {
    timeZone: CITY_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventDateShort(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString("en-GB", {
    timeZone: CITY_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Today's date as YYYY-MM-DD in the city timezone (for date-only comparisons). */
export function todayYmdInTz(now = new Date(), tz = CITY_TZ): string {
  return ymdInTz(now, tz);
}

/** Monday–Sunday of the current week as YYYY-MM-DD in the city timezone. */
export function getThisWeekYmdRange(now = new Date(), tz = CITY_TZ): { startYmd: string; endYmd: string } {
  const w = wallClockParts(now.getTime(), tz);
  const dow = dayOfWeekInTz(now, tz); // 0 = Sunday … 6 = Saturday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const mon = addCalendarDaysInTz(w.y, w.m, w.d, mondayOffset, tz);
  const sun = addCalendarDaysInTz(mon.y, mon.m, mon.d, 6, tz);
  return { startYmd: ymdFromParts(mon), endYmd: ymdFromParts(sun) };
}
