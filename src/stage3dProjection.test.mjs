import assert from "node:assert/strict";
import test from "node:test";

import { buildStage3dProjection, projectStagePoint } from "./stage3dProjection.mjs";

test("projects 2d stage coordinates onto a centered 3d ground plane", () => {
  assert.deepEqual(projectStagePoint({ x: 0, y: 0 }), { x: -50, y: 0, z: 50 });
  assert.deepEqual(projectStagePoint({ x: 100, y: 100 }), { x: 50, y: 0, z: -50 });
  assert.deepEqual(projectStagePoint({ x: 50, y: 70 }), { x: 0, y: 0, z: -20 });
});

test("projects compact stage coordinates against the supplied stage bounds", () => {
  const stage = { width: 12, height: 8 };

  assert.deepEqual(projectStagePoint({ x: 0, y: 0 }, stage), { x: -6, y: 0, z: 4 });
  assert.deepEqual(projectStagePoint({ x: 12, y: 8 }, stage), { x: 6, y: 0, z: -4 });
  assert.deepEqual(projectStagePoint({ x: 6, y: 4 }, stage), { x: 0, y: 0, z: 0 });
});

test("clamps invalid projection coordinates to the stage bounds", () => {
  assert.deepEqual(projectStagePoint({ x: 140, y: -10 }), { x: 50, y: 0, z: 50 });
  assert.deepEqual(projectStagePoint({ x: "bad", y: Number.NaN }), { x: -50, y: 0, z: 50 });
  assert.deepEqual(projectStagePoint({ x: 140, y: -10 }, { width: 12, height: 8 }), { x: 6, y: 0, z: 4 });
});

test("builds read-only 3d tokens from canonical performer positions", () => {
  const projection = buildStage3dProjection({
    stage: { width: 100, height: 100 },
    performers: [
      { id: "a", label: "A1", color: "#ef4444" },
      { id: "b", label: "B1", color: "#2563eb" }
    ],
    positions: {
      a: { x: 25, y: 60 },
      b: { x: 75, y: 40 }
    },
    selectedPerformerId: "b"
  });

  assert.equal(projection.tokens.length, 2);
  assert.deepEqual(projection.tokens.map((token) => token.focused), [false, true]);
  assert.deepEqual(projection.tokens[0].point, { x: -25, y: 0, z: -10 });
});

test("builds 3d bounds from custom stage dimensions", () => {
  const projection = buildStage3dProjection({
    stage: { width: 12, height: 8 },
    performers: [{ id: "a", label: "A1" }],
    positions: { a: { x: 6, y: 4 } }
  });

  assert.deepEqual(projection.bounds, {
    width: 12,
    depth: 8,
    xMin: -6,
    xMax: 6,
    zMin: -4,
    zMax: 4
  });
  assert.deepEqual(projection.tokens[0].point, { x: 0, y: 0, z: 0 });
});

test("includes transition samples without mutating canonical paths", () => {
  const path = { performerId: "a", from: { x: 10, y: 20 }, to: { x: 90, y: 80 }, context: "previous" };
  const projection = buildStage3dProjection({ transitionPaths: [path] });

  assert.deepEqual(projection.paths[0], {
    performerId: "a",
    context: "previous",
    from: { x: -40, y: 0, z: 30 },
    to: { x: 40, y: 0, z: -30 }
  });
  assert.deepEqual(path.from, { x: 10, y: 20 });
});
