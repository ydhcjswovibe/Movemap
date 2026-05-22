import assert from "node:assert/strict";
import test from "node:test";
import { COUPLE_GRID_SPACING, horizontalCouplePositions } from "./coupleLayout.mjs";

const plan = {
  performers: [
    { id: "lead", role: "male" },
    { id: "follow", role: "female" }
  ]
};

test("connected couples occupy two grid columns around their center", () => {
  const positions = horizontalCouplePositions(plan, "lead", "follow", { x: 50, y: 55 });

  assert.equal(positions.lead.x, 50 - COUPLE_GRID_SPACING);
  assert.equal(positions.follow.x, 50 + COUPLE_GRID_SPACING);
  assert.ok(Math.abs((positions.follow.x - positions.lead.x) - COUPLE_GRID_SPACING * 2) < 0.0001);
  assert.equal(positions.lead.y, 55);
  assert.equal(positions.follow.y, 55);
});

test("connected couples keep male tokens on the left when passed second", () => {
  const positions = horizontalCouplePositions(plan, "follow", "lead", { x: 50, y: 55 });

  assert.equal(positions.lead.x, 50 - COUPLE_GRID_SPACING);
  assert.equal(positions.follow.x, 50 + COUPLE_GRID_SPACING);
});
