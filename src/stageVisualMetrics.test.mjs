import assert from "node:assert/strict";
import test from "node:test";

import { stageTokenMetrics } from "./stageVisualMetrics.mjs";

test("stage token visual metrics scale without changing geometry modules", () => {
  const defaultMetrics = stageTokenMetrics();
  const compactMetrics = stageTokenMetrics({ width: 5, height: 6 });
  const largeMetrics = stageTokenMetrics({ width: 100, height: 100 });

  assert.equal(defaultMetrics.tokenRadius, 0.32);
  assert.equal(defaultMetrics.hitRadius, 0.72);
  assert.ok(defaultMetrics.selectedRingRadius < 0.45);
  assert.equal(compactMetrics.tokenRadius, 0.19);
  assert.equal(compactMetrics.labelFontSize, 0.2);
  assert.equal(compactMetrics.strokeWidth, 0.04);
  assert.ok(compactMetrics.hitRadius > compactMetrics.tokenRadius * 2);
  assert.equal(largeMetrics.tokenRadius, 4);
  assert.ok(largeMetrics.hitRadius > defaultMetrics.hitRadius);
});
