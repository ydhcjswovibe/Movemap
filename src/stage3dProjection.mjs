import { normalizeStageDimensions } from "./stageGeometry.mjs";

const LEGACY_PROJECTION_STAGE = Object.freeze({ width: 100, height: 100 });

function clampStage(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, number));
}

function roundProjection(value) {
  return Number(value.toFixed(2));
}

export function projectStagePoint(point = {}, stage = LEGACY_PROJECTION_STAGE) {
  const dimensions = normalizeStageDimensions(stage);
  const x = clampStage(point.x, dimensions.width);
  const y = clampStage(point.y, dimensions.height);
  return {
    x: roundProjection(x - dimensions.width / 2),
    y: 0,
    z: roundProjection(dimensions.height / 2 - y)
  };
}

export function buildStage3dProjection({
  stage = LEGACY_PROJECTION_STAGE,
  performers = [],
  positions = {},
  transitionPaths = [],
  selectedPerformerId = "",
  selectedPair = []
} = {}) {
  const dimensions = normalizeStageDimensions(stage);
  const focused = new Set([selectedPerformerId, ...(selectedPair || [])].filter(Boolean));
  const tokens = performers
    .map((performer) => {
      const position = positions[performer.id];
      if (!position) return null;
      return {
        id: performer.id,
        label: performer.name || performer.label || performer.id,
        color: performer.color || "#475569",
        focused: focused.size ? focused.has(performer.id) : false,
        point: projectStagePoint(position, dimensions)
      };
    })
    .filter(Boolean);

  const paths = transitionPaths
    .filter((path) => path?.from && path?.to)
    .map((path) => ({
      performerId: path.performerId,
      context: path.context || "current",
      from: projectStagePoint(path.from, dimensions),
      to: projectStagePoint(path.to, dimensions)
    }));

  return {
    tokens,
    paths,
    bounds: {
      width: dimensions.width,
      depth: dimensions.height,
      xMin: roundProjection(-dimensions.width / 2),
      xMax: roundProjection(dimensions.width / 2),
      zMin: roundProjection(-dimensions.height / 2),
      zMax: roundProjection(dimensions.height / 2)
    }
  };
}
