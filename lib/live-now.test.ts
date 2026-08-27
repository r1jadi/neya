import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveNowItems, isVenueOpenNow } from "@/lib/live-now";
import type { Event, Venue } from "@/types";

const event = (overrides: Partial<Event>): Event => ({ id: "e", slug: "e", title: "Live music", venue: null, starts_at: "2026-08-27T20:00:00Z", genre: "live_music", image_url: "", crowd_count: 10, atmosphere_rating: 8, live_status: true, price_level: 2, ...overrides });
const venue = (overrides: Partial<Venue>): Venue => ({ id: "v", slug: "v", name: "Bar", city_slug: "prishtina", category: "bar", image_url: "", price_level: 2, ...overrides });

test("past events are excluded while current and soon events remain", () => {
  const now = new Date("2026-08-27T20:00:00Z");
  const items = buildLiveNowItems([event({ id: "past", starts_at: "2026-08-27T10:00:00Z", ends_at: "2026-08-27T19:00:00Z" }), event({ id: "current", starts_at: "2026-08-27T19:00:00Z", ends_at: "2026-08-27T22:00:00Z" }), event({ id: "soon", starts_at: "2026-08-27T21:00:00Z" })], [], "all", now);
  assert.deepEqual(items.map((item) => item.id), ["current", "soon"]);
});

test("filters classify music and drinks", () => {
  const now = new Date("2026-08-27T20:00:00Z");
  assert.equal(buildLiveNowItems([event({ id: "music" }), event({ id: "party", title: "Party" })], [venue({ id: "drinks", name: "Cocktail Bar", category: "cocktail_bar" })], "music", now).some((item) => item.id === "music"), true);
  assert.equal(buildLiveNowItems([], [venue({ id: "drinks", name: "Cocktail Bar", category: "cocktail_bar", is_live: true })], "drinks", now)[0]?.id, "drinks");
});

test("day parts determine venue open status and live overrides missing hours", () => {
  const evening = new Date("2026-08-27T18:00:00Z");
  assert.equal(isVenueOpenNow(venue({ day_parts: ["morning"] }), evening), false);
  assert.equal(isVenueOpenNow(venue({ is_live: true, day_parts: ["morning"] }), evening), true);
  assert.equal(isVenueOpenNow(venue({}), evening), false);
  assert.equal(isVenueOpenNow(venue({ is_featured: true }), evening), true);
});
