import assert from "node:assert/strict";
import test from "node:test";
import {
  COUPLE_GRID_SPACING,
  PAIR_HANDLE_OFFSET,
  horizontalCouplePositions,
  pairHandlePosition,
  pairPlacementCollides
} from "./coupleLayout.mjs";

const plan = {
  performers: [
    { id: "lead", role: "male" },
    { id: "follow", role: "female" }
  ]
};

test("connected couples occupy two grid columns around their center", () => {
  const positions = horizontalCouplePositions(plan, "lead", "follow", { x: 50, y: 55 });

  assert.equal(positions.lead.x, 50 - COUPLE_GRID_SPACING / 2);
  assert.equal(positions.follow.x, 50 + COUPLE_GRID_SPACING / 2);
  assert.ok(Math.abs((positions.follow.x - positions.lead.x) - COUPLE_GRID_SPACING) < 0.0001);
  assert.equal(positions.lead.y, 55);
  assert.equal(positions.follow.y, 55);
});

test("connected couples keep male tokens on the left when passed second", () => {
  const positions = horizontalCouplePositions(plan, "follow", "lead", { x: 50, y: 55 });

  assert.equal(positions.lead.x, 50 - COUPLE_GRID_SPACING / 2);
  assert.equal(positions.follow.x, 50 + COUPLE_GRID_SPACING / 2);
});

test("pair handle sits above the couple midpoint without changing the movement center", () => {
  const midpoint = { x: 50, y: 55 };
  const handle = pairHandlePosition(midpoint);

  assert.equal(handle.x, midpoint.x);
  assert.equal(handle.y, midpoint.y - PAIR_HANDLE_OFFSET);
});

test("pair placement rejects another token sitting in either couple slot", () => {
  const existing = {
    lead: { x: 10, y: 10 },
    follow: { x: 18.8, y: 10 },
    other: { x: 45.6, y: 55 }
  };
  const proposed = {
    lead: { x: 45.6, y: 55 },
    follow: { x: 54.4, y: 55 }
  };

  assert.equal(pairPlacementCollides(existing, proposed, ["lead", "follow"]), true);
});

test("pair placement allows the moving pair itself and adjacent open grid slots", () => {
  const existing = {
    lead: { x: 45.6, y: 55 },
    follow: { x: 54.4, y: 55 },
    other: { x: 63.2, y: 55 }
  };
  const proposed = {
    lead: { x: 45.6, y: 55 },
    follow: { x: 54.4, y: 55 }
  };

  assert.equal(pairPlacementCollides(existing, proposed, ["lead", "follow"]), false);
});
