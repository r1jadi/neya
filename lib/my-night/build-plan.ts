import type { RecommendationItem } from "@/lib/recommendations";

export type NightPlanItem = RecommendationItem & {
  timeLabel: string;
  activity: string;
  estimatedCost: string;
};

function startMs(item: RecommendationItem): number | null {
  if (!item.startsAt) return null;
  const value = new Date(item.startsAt).getTime();
  return Number.isFinite(value) ? value : null;
}

function categoryText(item: RecommendationItem): string {
  return `${item.title} ${item.reasons.join(" ")}`.toLowerCase();
}

function activityFor(item: RecommendationItem): string {
  const text = categoryText(item);
  if (/dinner|food|restaurant/.test(text)) return "Dinner";
  if (/rooftop|drink|cocktail|bar|lounge/.test(text)) return "Drinks / rooftop";
  if (/event|club|party|dj|concert|music|techno/.test(text)) return "Event / nightlife";
  return item.kind === "event" ? "Event" : "Night out";
}

function costFor(item: RecommendationItem): string {
  const budgetReason = item.reasons.find((reason) => /budget/i.test(reason));
  return budgetReason ? budgetReason.replace(/^Fits your\s*/i, "") : "Price varies";
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "Flexible";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Selects up to three recommendations in chronological order. Items without
 * times remain eligible only as flexible stops after timed activities; timed
 * items that overlap the previous timed item are skipped.
 */
export function buildNightPlan(items: RecommendationItem[], maxItems = 3): NightPlanItem[] {
  const unique = [...new Map(items.map((item) => [`${item.kind}:${item.id}`, item])).values()];
  const sorted = [...unique].sort((a, b) => (startMs(a) ?? Number.MAX_SAFE_INTEGER) - (startMs(b) ?? Number.MAX_SAFE_INTEGER) || b.score - a.score);
  const chosen: NightPlanItem[] = [];
  let previousEnd: number | null = null;

  for (const item of sorted) {
    if (chosen.length >= maxItems) break;
    const start = startMs(item);
    if (start != null && previousEnd != null && start < previousEnd) continue;
    chosen.push({ ...item, timeLabel: formatTime(item.startsAt), activity: activityFor(item), estimatedCost: costFor(item) });
    if (start != null) previousEnd = start + (item.kind === "event" ? 3 * 3600000 : 90 * 60000);
  }
  return chosen;
}
