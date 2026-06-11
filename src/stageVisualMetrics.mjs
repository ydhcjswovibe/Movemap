import { DEFAULT_STAGE_DIMENSIONS, normalizeStageDimensions } from "./stageGeometry.mjs";

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}

function clampMetric(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function stageTokenMetrics(stage = DEFAULT_STAGE_DIMENSIONS) {
  const dimensions = normalizeStageDimensions(stage);
  const shortSide = Math.max(1, Math.min(dimensions.width, dimensions.height));
  const compactScale = shortSide < 8 ? 0.038 : 0.04;
  const tokenRadius = roundMetric(Math.max(0.19, Math.min(4.2, shortSide * compactScale)));
  return {
    tokenRadius,
    selectedRingRadius: roundMetric(Math.max(tokenRadius * 1.25, tokenRadius + 0.08)),
    pairRingRadius: roundMetric(Math.max(tokenRadius * 1.12, tokenRadius + 0.07)),
    selectedPairRingRadius: roundMetric(Math.max(tokenRadius * 1.22, tokenRadius + 0.1)),
    hitRadius: roundMetric(Math.max(tokenRadius * 2.15, 0.72)),
    candidateRadius: roundMetric(Math.max(tokenRadius * 1.7, 0.56)),
    centerDotRadius: roundMetric(Math.max(tokenRadius * 0.22, 0.07)),
    ghostRadius: roundMetric(Math.max(tokenRadius * 0.6, 0.18)),
    previewRadius: roundMetric(Math.max(tokenRadius * 0.74, 0.22)),
    labelFontSize: roundMetric(Math.max(tokenRadius * 0.82, 0.2)),
    strokeWidth: roundMetric(Math.max(tokenRadius * 0.17, 0.04))
  };
}

export function v2StageTokenPixelMetrics({
  widthPx = 0,
  heightPx = 0,
  columns = DEFAULT_STAGE_DIMENSIONS.width,
  rows = DEFAULT_STAGE_DIMENSIONS.height
} = {}) {
  const safeColumns = Math.max(1, Number(columns) || DEFAULT_STAGE_DIMENSIONS.width);
  const safeRows = Math.max(1, Number(rows) || DEFAULT_STAGE_DIMENSIONS.height);
  const cellWidth = Math.max(0, Number(widthPx) || 0) / safeColumns;
  const cellHeight = Math.max(0, Number(heightPx) || 0) / safeRows;
  const baseCell = Math.max(0, Math.min(cellWidth, cellHeight));
  const tokenSizePx = roundMetric(clampMetric(baseCell * 0.8, 18, 34));
  return {
    tokenSizePx,
    labelFontSizePx: roundMetric(clampMetric(tokenSizePx * 0.335, 7.5, 11.4)),
    hitSizePx: roundMetric(Math.max(tokenSizePx + 10, 28)),
    selectedRingSpreadPx: roundMetric(clampMetric(tokenSizePx * 0.16, 3, 5.5))
  };
}
