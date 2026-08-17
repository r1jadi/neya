import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeStops, MAX_NIGHT_STOPS } from "./logic.ts";

test("mergeStops keeps existing order and appends new stops", () => {
  const merged = mergeStops(
    [{ kind: "venue", refId: "a" }],
    [{ kind: "event", refId: "b" }, { kind: "venue", refId: "c" }],
  );
  assert.deepEqual(merged, [
    { kind: "venue", refId: "a" },
    { kind: "event", refId: "b" },
    { kind: "venue", refId: "c" },
  ]);
});

test("mergeStops dedupes by kind+refId across both lists", () => {
  const merged = mergeStops(
    [{ kind: "venue", refId: "a" }, { kind: "event", refId: "b" }],
    [{ kind: "venue", refId: "a" }, { kind: "event", refId: "b" }],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].refId, "a");
  assert.equal(merged[1].refId, "b");
});

test("mergeStops never exceeds the 3-stop cap", () => {
  const merged = mergeStops(
    [
      { kind: "venue", refId: "1" },
      { kind: "venue", refId: "2" },
      { kind: "venue", refId: "3" },
    ],
    [{ kind: "venue", refId: "4" }],
  );
  assert.equal(merged.length, MAX_NIGHT_STOPS);
  assert.equal(merged[2].refId, "3");
});

test("mergeStops drops invalid entries", () => {
  const merged = mergeStops(
    [] as { kind: "venue" | "event"; refId: string }[],
    [
      { kind: "venue", refId: "ok" },
      { kind: "other", refId: "x" } as never,
      { kind: "event", refId: "" },
      null as never,
    ],
  );
  assert.deepEqual(merged, [{ kind: "venue", refId: "ok" }]);
});
