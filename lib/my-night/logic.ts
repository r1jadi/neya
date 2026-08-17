export type MyNightRefInput = { kind: "venue" | "event"; refId: string };

export const MAX_NIGHT_STOPS = 3;

function refKey(ref: MyNightRefInput): string {
  return `${ref.kind}:${ref.refId}`;
}

/**
 * Merge incoming stops into an existing plan: keep the existing order first,
 * append new stops that aren't already present, and never exceed 3 stops.
 * Used for the guest → account merge and for re-adding after a login.
 */
export function mergeStops(existing: MyNightRefInput[], incoming: MyNightRefInput[]): MyNightRefInput[] {
  const seen = new Set<string>();
  const out: MyNightRefInput[] = [];
  for (const ref of [...existing, ...incoming]) {
    if (!ref || (ref.kind !== "venue" && ref.kind !== "event") || !ref.refId) continue;
    const key = refKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    if (out.length >= MAX_NIGHT_STOPS) break;
  }
  return out;
}
