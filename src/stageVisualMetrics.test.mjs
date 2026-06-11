import assert from "node:assert/strict";
import test from "node:test";

import { stageTokenMetrics, v2StageTokenPixelMetrics } from "./stageVisualMetrics.mjs";

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

test("V2 stage token pixel metrics follow rendered grid cell size with clamps", () => {
  const defaultMetrics = v2StageTokenPixelMetrics({
    widthPx: 390,
    heightPx: 260,
    columns: 12,
    rows: 8
  });
  assert.equal(defaultMetrics.tokenSizePx, 26);
  assert.equal(defaultMetrics.labelFontSizePx, 8.71);
  assert.equal(defaultMetrics.hitSizePx, 36);
  assert.equal(defaultMetrics.selectedRingSpreadPx, 4.16);

  const tinyMetrics = v2StageTokenPixelMetrics({
    widthPx: 160,
    heightPx: 100,
    columns: 12,
    rows: 8
  });
  assert.equal(tinyMetrics.tokenSizePx, 18);
  assert.equal(tinyMetrics.hitSizePx, 28);

  const largeMetrics = v2StageTokenPixelMetrics({
    widthPx: 900,
    heightPx: 600,
    columns: 12,
    rows: 8
  });
  assert.equal(largeMetrics.tokenSizePx, 34);
  assert.equal(largeMetrics.hitSizePx, 44);
});
