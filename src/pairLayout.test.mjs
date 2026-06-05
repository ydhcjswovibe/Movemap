import assert from "node:assert/strict";
import test from "node:test";
import {
  PAIR_GRID_SPACING,
  STAGE_GRID_X,
  STAGE_GRID_Y,
  pairGridForStage,
  pairMetricsForStage,
  findPairGridPlacement,
  horizontalPairPositions,
  pairPlacementCollides
} from "./pairLayout.mjs";

const plan = {
  performers: [
    { id: "lead", role: "groupA" },
    { id: "follow", role: "groupB" }
  ]
};

function assertOnGrid(position) {
  assert.ok(STAGE_GRID_X.includes(position.x), `${position.x} is not on GRID_X`);
  assert.ok(STAGE_GRID_Y.includes(position.y), `${position.y} is not on GRID_Y`);
}

function assertHorizontalAdjacent(left, right) {
  assert.equal(left.y, right.y);
  assert.equal(STAGE_GRID_X.indexOf(right.x), STAGE_GRID_X.indexOf(left.x) + 1);
  assert.ok(Math.abs((right.x - left.x) - PAIR_GRID_SPACING) < 0.0001);
}

function assertInsideStage(position, stage) {
  assert.ok(position.x >= 0 && position.x <= stage.width, `${position.x} is outside stage width`);
  assert.ok(position.y >= 0 && position.y <= stage.height, `${position.y} is outside stage height`);
}

test("connected pairs occupy two real adjacent grid points", () => {
  const positions = findPairGridPlacement({
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

test("connected pairs use stage-sized adjacent grid points on the default 12x8 stage", () => {
  const stage = { width: 12, height: 8 };
  const grid = pairGridForStage(stage);
  const metrics = pairMetricsForStage(stage);
  const positions = findPairGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 6, y: 5 },
    positions: {},
    stage
  });

  assertInsideStage(positions.lead, stage);
  assertInsideStage(positions.follow, stage);
  assert.ok(grid.x.includes(positions.lead.x), `${positions.lead.x} is not on stage grid x`);
  assert.ok(grid.x.includes(positions.follow.x), `${positions.follow.x} is not on stage grid x`);
  assert.ok(grid.y.includes(positions.lead.y), `${positions.lead.y} is not on stage grid y`);
  assert.equal(positions.lead.y, positions.follow.y);
  assert.ok(Math.abs((positions.follow.x - positions.lead.x) - metrics.spacing) < 0.0001);
});

test("compact pair grid never creates near-overlapping right-edge pair slots", () => {
  const stage = { width: 12, height: 8 };
  const metrics = pairMetricsForStage(stage);
  const grid = pairGridForStage(stage);
  const positions = findPairGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 11.8, y: 4 },
    positions: {},
    stage
  });

  grid.x.slice(1).forEach((x, index) => {
    assert.ok(x - grid.x[index] >= metrics.collisionDistance, `${grid.x[index]} and ${x} are too close`);
  });
  assert.ok(positions.follow.x - positions.lead.x >= metrics.collisionDistance);
});

test("connected pairs keep group A tokens on the left when passed second", () => {
  const positions = findPairGridPlacement({
    plan,
    firstId: "follow",
    secondId: "lead",
    point: { x: 50, y: 55 },
    positions: {}
  });

  assert.ok(positions.lead.x < positions.follow.x);
  assertHorizontalAdjacent(positions.lead, positions.follow);
});

test("pair placement skips the nearest occupied slots", () => {
  const positions = findPairGridPlacement({
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

test("pair placement returns null when no adjacent grid slots are open", () => {
  const occupied = Object.fromEntries(STAGE_GRID_Y.flatMap((y, row) => (
    STAGE_GRID_X.map((x, column) => [`blocker-${row}-${column}`, { x, y }])
  )));
  const positions = findPairGridPlacement({
    plan,
    firstId: "lead",
    secondId: "follow",
    point: { x: 45.6, y: 46 },
    positions: occupied
  });

  assert.equal(positions, null);
});

test("horizontalPairPositions also snaps to adjacent grid points", () => {
  const positions = horizontalPairPositions(plan, "lead", "follow", { x: 50, y: 55 });

  assertOnGrid(positions.lead);
  assertOnGrid(positions.follow);
  assertHorizontalAdjacent(positions.lead, positions.follow);
});

test("pair placement rejects another token sitting in either pair slot", () => {
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

test("pair placement collision distance scales to a compact 12x8 stage", () => {
  const stage = { width: 12, height: 8 };
  const metrics = pairMetricsForStage(stage);
  const proposed = {
    lead: { x: 5.5, y: 5 },
    follow: { x: 6.5, y: 5 }
  };

  assert.ok(metrics.collisionDistance < 1);
  assert.equal(pairPlacementCollides({
    other: { x: 6.4, y: 5 }
  }, proposed, ["lead", "follow"], metrics.collisionDistance), true);
  assert.equal(pairPlacementCollides({
    other: { x: 8, y: 5 }
  }, proposed, ["lead", "follow"], metrics.collisionDistance), false);
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
