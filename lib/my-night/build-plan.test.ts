import test from "node:test";
import assert from "node:assert/strict";
import { buildNightPlan } from "@/lib/my-night/build-plan";
import type { RecommendationItem } from "@/lib/recommendations";

const item = (id: string, startsAt?: string, kind: "event" | "venue" = "event", score = 10): RecommendationItem => ({
  id, kind, slug: id, title: id, image: "", startsAt, score, reasons: [],
});

test("builds a chronological, deduplicated plan", () => {
  const plan = buildNightPlan([item("late", "2026-08-27T23:00:00Z"), item("early", "2026-08-27T18:00:00Z"), item("early", "2026-08-27T19:00:00Z")]);
  assert.deepEqual(plan.map((entry) => entry.id), ["early", "late"]);
});

test("skips overlapping timed recommendations", () => {
  const plan = buildNightPlan([item("one", "2026-08-27T20:00:00Z"), item("overlap", "2026-08-27T21:00:00Z"), item("later", "2026-08-28T01:00:00Z")]);
  assert.deepEqual(plan.map((entry) => entry.id), ["one", "later"]);
});

test("keeps flexible venues when time data is missing", () => {
  const plan = buildNightPlan([item("event", "2026-08-27T20:00:00Z"), item("place", undefined, "venue")]);
  assert.deepEqual(plan.map((entry) => entry.id), ["event", "place"]);
  assert.equal(plan[1]?.timeLabel, "Flexible");
});
