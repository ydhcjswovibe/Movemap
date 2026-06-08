import { DEFAULT_STAGE_DIMENSIONS, normalizeStageDimensions } from "./stageGeometry.mjs";

function roundMetric(value) {
  return Math.round(value * 100) / 100;
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
