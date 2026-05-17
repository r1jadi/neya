/** Prishtina / Kosovo — CET/CEST */
export const CITY_TZ = "Europe/Belgrade";

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
