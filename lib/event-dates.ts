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
