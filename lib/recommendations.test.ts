import test from "node:test";
import assert from "node:assert/strict";
import { budgetRange, rankTonightRecommendations } from "@/lib/recommendations";
import type { Event, Venue } from "@/types";

const event = (overrides: Partial<Event>): Event => ({
  id: "e1", slug: "e1", title: "Event", venue: null, starts_at: "2026-08-27T20:00:00Z", genre: "techno", image_url: "x", crowd_count: 0, atmosphere_rating: 8, live_status: false, price_level: 2, is_free: false, ticket_from_eur: 15, category: "nightlife", ...overrides,
});
const venue = (overrides: Partial<Venue>): Venue => ({
  id: "v1", slug: "v1", name: "Venue", city_slug: "prishtina", category: "rooftop", image_url: "x", price_level: 2, ...overrides,
});

test("budget ranges are explicit and ordered", () => {
  assert.deepEqual(budgetRange("under €20"), [0, 20]);
  assert.deepEqual(budgetRange("€20–50"), [20, 50]);
  assert.deepEqual(budgetRange("€50+"), [50, Number.POSITIVE_INFINITY]);
});

test("recommendations exclude events outside budget and category", () => {
  const result = rankTonightRecommendations([
    event({ id: "cheap", ticket_from_eur: 10, category: "nightlife" }),
    event({ id: "expensive", ticket_from_eur: 60, category: "concert" }),
  ], [], { budget: "under €20", categories: ["nightlife"] });
  assert.deepEqual(result.map((item) => item.id), ["cheap"]);
});

test("matching events rank ahead of generic venues and explain why", () => {
  const result = rankTonightRecommendations([
    event({ id: "techno", title: "Techno Night", ticket_from_eur: 25 }),
    event({ id: "other", title: "Dinner", genre: "jazz", category: "food_drink", ticket_from_eur: 25 }),
  ], [venue({ id: "roof", name: "Rooftop Bar" })], { vibe: "techno", budget: "€20–50" });
  assert.equal(result[0]?.id, "techno");
  assert.match(result[0]?.reasons[0] ?? "", /techno/i);
});

test("time range excludes prior and future events", () => {
  const result = rankTonightRecommendations([
    event({ id: "before", starts_at: "2026-08-27T18:00:00Z" }),
    event({ id: "inside", starts_at: "2026-08-27T21:00:00Z" }),
    event({ id: "after", starts_at: "2026-08-28T01:00:00Z" }),
  ], [], { from: "2026-08-27T20:00:00Z", to: "2026-08-27T23:00:00Z" });
  assert.deepEqual(result.map((item) => item.id), ["inside"]);
});
