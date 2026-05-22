import assert from "node:assert/strict";
import test from "node:test";
import {
  COUPLE_GRID_SPACING,
  STAGE_GRID_X,
  STAGE_GRID_Y,
  findCoupleGridPlacement,
  horizontalCouplePositions,
  pairPlacementCollides
} from "./coupleLayout.mjs";

const plan = {
  performers: [
    { id: "lead", role: "male" },
    { id: "follow", role: "female" }
  ]
};

function assertOnGrid(position) {
  assert.ok(STAGE_GRID_X.includes(position.x), `${position.x} is not on GRID_X`);
  assert.ok(STAGE_GRID_Y.includes(position.y), `${position.y} is not on GRID_Y`);
}

function assertHorizontalAdjacent(left, right) {
  assert.equal(left.y, right.y);
  assert.equal(STAGE_GRID_X.indexOf(right.x), STAGE_GRID_X.indexOf(left.x) + 1);
  assert.ok(Math.abs((right.x - left.x) - COUPLE_GRID_SPACING) < 0.0001);
}

test("connected couples occupy two real adjacent grid points", () => {
  const positions = findCoupleGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 50, y: 55 },
    positions: {}
  });

  assertOnGrid(positions.lead);
  assertOnGrid(positions.follow);
  assertHorizontalAdjacent(positions.lead, positions.follow);
});

test("connected couples keep male tokens on the left when passed second", () => {
  const positions = findCoupleGridPlacement({
    plan,
    firstId: "follow",
    secondId: "lead",
    point: { x: 50, y: 55 },
    positions: {}
  });

  assert.ok(positions.lead.x < positions.follow.x);
  assertHorizontalAdjacent(positions.lead, positions.follow);
});

test("couple placement skips the nearest occupied slots", () => {
  const positions = findCoupleGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 45.6, y: 46 },
    positions: {
      blocker: { x: 41.2, y: 46 }
    }
  });

  assert.deepEqual(positions, {
    lead: { x: 50, y: 46 },
    follow: { x: 58.8, y: 46 }
  });
});

test("couple placement returns null when no adjacent grid slots are open", () => {
  const occupied = Object.fromEntries(STAGE_GRID_Y.flatMap((y, row) => (
    STAGE_GRID_X.map((x, column) => [`blocker-${row}-${column}`, { x, y }])
  )));
  const positions = findCoupleGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 45.6, y: 46 },
    positions: occupied
  });

  assert.equal(positions, null);
});

test("legacy horizontalCouplePositions also snaps to adjacent grid points", () => {
  const positions = horizontalCouplePositions(plan, "lead", "follow", { x: 50, y: 55 });

  assertOnGrid(positions.lead);
  assertOnGrid(positions.follow);
  assertHorizontalAdjacent(positions.lead, positions.follow);
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
