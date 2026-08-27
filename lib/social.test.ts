import test from "node:test";
import assert from "node:assert/strict";
import { groupFriendActivity } from "@/lib/social";

test("groups friend activity by public object and deduplicates people", () => {
  const grouped = groupFriendActivity([
    { object_type: "event", object_id: "e1", meta: {}, actor: { id: "u1", display_name: "A" } },
    { object_type: "event", object_id: "e1", meta: {}, actor: { id: "u2", display_name: "B" } },
    { object_type: "event", object_id: "e1", meta: {}, actor: { id: "u1", display_name: "A" } },
    { object_type: "venue", object_id: "v1", meta: {}, actor: { id: "u2", display_name: "B" } },
    { object_type: "venue", object_id: null, meta: {}, actor: { id: "u3", display_name: "C" } },
  ]);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped[0]?.people.map((person) => person.id), ["u1", "u2"]);
});
