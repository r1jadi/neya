/** Prishtina / Kosovo — CET/CEST */
export const CITY_TZ = "Europe/Belgrade";

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
