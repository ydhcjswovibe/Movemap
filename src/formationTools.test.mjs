import assert from "node:assert/strict";
import test from "node:test";

import {
  alignSelectedPerformers,
  deleteSelectionTarget,
  duplicateSelectionTarget,
  moveSelectedPerformers,
  performerIdsForRole,
  togglePerformerSelection
} from "./formationTools.mjs";

test("duplicate selects the new copy and delete selects the nearest neighbor", () => {
  const sections = [
    { id: "a", time: 0 },
    { id: "b", time: 10 },
    { id: "c", time: 20 }
  ];

  assert.equal(duplicateSelectionTarget(sections, "copy"), "");
  assert.equal(duplicateSelectionTarget([...sections, { id: "copy", time: 11 }], "copy"), "copy");
  assert.deepEqual(deleteSelectionTarget(sections, "b"), { nextSectionId: "a", disabled: false });
  assert.deepEqual(deleteSelectionTarget([{ id: "a", time: 0 }], "a"), { nextSectionId: "", disabled: true });
});

test("multi-select can toggle roles, move performers, and align them", () => {
  const performers = [{ id: "a", role: "lead" }, { id: "b", role: "lead" }, { id: "c", role: "back" }];
  const positions = { a: { x: 10, y: 10 }, b: { x: 30, y: 50 }, c: { x: 80, y: 80 } };
  const selected = togglePerformerSelection(["a"], "b", true);
  const moved = moveSelectedPerformers(positions, selected, { x: 5, y: -5 });
  const aligned = alignSelectedPerformers(moved, performerIdsForRole(performers, "lead"), "y");

  assert.deepEqual(selected, ["a", "b"]);
  assert.deepEqual(moved.a, { x: 15, y: 5 });
  assert.equal(aligned.a.y, aligned.b.y);
  assert.deepEqual(performerIdsForRole(performers, "lead"), ["a", "b"]);
});

test("multi-select movement clamps to compact stage bounds", () => {
  const moved = moveSelectedPerformers(
    { a: { x: 11.8, y: 7.8 }, b: { x: 2, y: 2 } },
    ["a", "b"],
    { x: 5, y: 5 },
    { width: 12, height: 8 }
  );

  assert.ok(moved.a.x <= 12);
  assert.ok(moved.a.y <= 8);
  assert.ok(moved.b.x <= 12);
  assert.ok(moved.b.y <= 8);
});
