import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_STAGE_DIMENSIONS,
  canResizeStage,
  clientPointToStage,
  collectOutOfBoundsStageItems,
  normalizeStageDimensions,
  stageTokenMetrics,
  stageViewBox
} from "./stageGeometry.mjs";

test("normalizes stage dimensions and builds the svg viewBox", () => {
  assert.deepEqual(DEFAULT_STAGE_DIMENSIONS, { width: 12, height: 8 });
  assert.deepEqual(normalizeStageDimensions(), { width: 12, height: 8 });
  assert.equal(stageViewBox(), "0 0 12 8");
  assert.deepEqual(normalizeStageDimensions({ width: 128, height: 84 }), { width: 128, height: 84 });
  assert.deepEqual(normalizeStageDimensions({ width: 5, height: 6 }), { width: 5, height: 6 });
  assert.deepEqual(normalizeStageDimensions({ width: 0, height: 999 }), { width: 1, height: 200 });
  assert.equal(stageViewBox({ width: 128, height: 84 }), "0 0 128 84");
  assert.equal(stageViewBox({ width: 5, height: 6 }), "0 0 5 6");
});

test("stage token metrics scale to the current stage size", () => {
  const defaultMetrics = stageTokenMetrics();
  const largeMetrics = stageTokenMetrics({ width: 100, height: 100 });

  assert.equal(defaultMetrics.tokenRadius, 0.4);
  assert.equal(defaultMetrics.hitRadius, 0.9);
  assert.ok(defaultMetrics.selectedRingRadius < 0.7);
  assert.equal(largeMetrics.tokenRadius, 4.2);
  assert.ok(largeMetrics.hitRadius > defaultMetrics.hitRadius);
});

test("stage shrink blocks performers and references outside the new bounds", () => {
  const plan = {
    sections: [
      { id: "f1", name: "F1", positions: { a1: { x: 90, y: 72 } } },
      { id: "f2", name: "F2", positions: { a1: { x: 80, y: 60 } }, movementKeyframes: [{ positions: { a1: { x: 105, y: 50 } } }] }
    ],
    stageReferences: [{ id: "front-line", type: "line", label: "앞줄", x1: 8, y1: 70, x2: 92, y2: 70 }]
  };

  const blockingItems = collectOutOfBoundsStageItems(plan, { width: 88, height: 68 });

  assert.equal(canResizeStage(plan, { width: 120, height: 90 }).ok, true);
  assert.equal(canResizeStage(plan, { width: 88, height: 68 }).ok, false);
  assert.ok(blockingItems.some((item) => item.type === "performer" && item.performerId === "a1"));
  assert.ok(blockingItems.some((item) => item.type === "reference" && item.referenceId === "front-line"));
});

test("client coordinates convert against the current stage dimensions", () => {
  const svg = {
    getScreenCTM: () => null,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 })
  };

  assert.deepEqual(clientPointToStage(svg, { clientX: 110, clientY: 70 }, { width: 140, height: 80 }), { x: 70, y: 40 });
});
