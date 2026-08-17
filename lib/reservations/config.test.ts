import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReservationConfig } from "./config.ts";

const baseVenue = {
  reservation_price_eur: 5,
  requires_online_payment: false,
  allows_pay_at_venue: true,
  reservations_enabled: true,
};

test("venue base price applies when there is no event override", () => {
  const config = resolveReservationConfig(baseVenue, {});
  assert.equal(config.priceEur, 5);
  assert.equal(config.priceCents, 500);
  assert.equal(config.isFree, false);
  assert.equal(config.reservationsEnabled, true);
});

test("event override price wins over the venue base (5 -> 10)", () => {
  const config = resolveReservationConfig(baseVenue, { reservation_price_eur: 10 });
  assert.equal(config.priceEur, 10);
  assert.equal(config.priceCents, 1000);
});

test("removed override falls back to the venue base (null override -> 5)", () => {
  const config = resolveReservationConfig(baseVenue, { reservation_price_eur: null });
  assert.equal(config.priceEur, 5);
  assert.equal(config.priceCents, 500);
});

test("€0 stays free — zero is a value, not a missing price", () => {
  const free = resolveReservationConfig(baseVenue, { reservation_price_eur: 0 });
  assert.equal(free.priceEur, 0);
  assert.equal(free.isFree, true);
});

test("venue-less event: reservations enabled by default, event price preserved", () => {
  const config = resolveReservationConfig(null, { reservation_price_eur: 5 });
  assert.equal(config.reservationsEnabled, true);
  assert.equal(config.priceEur, 5);
  assert.equal(config.priceCents, 500);
});

test("venue-less event with no price is free and open", () => {
  const config = resolveReservationConfig(null, {});
  assert.equal(config.reservationsEnabled, true);
  assert.equal(config.isFree, true);
});

test("venue-less event can explicitly close reservations", () => {
  const config = resolveReservationConfig(null, { reservation_price_eur: 5, reservations_enabled: false });
  assert.equal(config.reservationsEnabled, false);
  assert.equal(config.priceEur, 5);
});

test("event reservations_enabled=false closes reservations even with a venue", () => {
  const config = resolveReservationConfig(baseVenue, { reservations_enabled: false });
  assert.equal(config.reservationsEnabled, false);
});

test("reservations disabled flag on venue closes reservations", () => {
  const config = resolveReservationConfig({ ...baseVenue, reservations_enabled: false });
  assert.equal(config.reservationsEnabled, false);
});
