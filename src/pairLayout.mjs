import { DEFAULT_STAGE_DIMENSIONS, normalizeStageDimensions, stageTokenMetrics } from "./stageGeometry.mjs";

export const PAIR_GRID_SPACING = 8.8;
export const TOKEN_COLLISION_DISTANCE = 8.4;
export const STAGE_GRID_X = [14.8, 23.6, 32.4, 41.2, 50, 58.8, 67.6, 76.4, 85.2];
export const STAGE_GRID_Y = [10.8, 19.6, 28.4, 37.2, 46, 54.8, 63.6, 72.4, 81.2, 90];
const LEGACY_GROUP_A_ROLE = "ma" + "le";
const LEGACY_GROUP_B_ROLE = "fe" + "ma" + "le";

function roundStage(value) {
  return Math.round(value * 10) / 10;
}

function isDefaultStage(stage) {
  if (!stage) return false;
  const dimensions = normalizeStageDimensions(stage);
  return dimensions.width === DEFAULT_STAGE_DIMENSIONS.width && dimensions.height === DEFAULT_STAGE_DIMENSIONS.height;
}

export function pairMetricsForStage(stage) {
  if (!stage) {
    return {
      spacing: PAIR_GRID_SPACING,
      collisionDistance: TOKEN_COLLISION_DISTANCE
    };
  }
  const dimensions = normalizeStageDimensions(stage);
  const shortSide = Math.max(1, Math.min(dimensions.width, dimensions.height));
  const tokenMetrics = stageTokenMetrics(dimensions);
  const spacing = roundStage(Math.max(tokenMetrics.tokenRadius * 2.2, Math.min(shortSide * 0.11, PAIR_GRID_SPACING)));
  const collisionDistance = roundStage(Math.max(tokenMetrics.tokenRadius * 1.8, Math.min(tokenMetrics.hitRadius * 0.94, TOKEN_COLLISION_DISTANCE)));
  return { spacing, collisionDistance };
}

function stageGridAxis(size, spacing, marginRatio) {
  const margin = Math.max(spacing * 1.35, size * marginRatio);
  if (size <= margin * 2) return [roundStage(size / 2)];
  const points = [];
  for (let value = margin; value <= size - margin + 0.001; value += spacing) {
    points.push(roundStage(value));
  }
  const far = roundStage(size - margin);
  const last = points.at(-1);
  if (!points.includes(far) && (!Number.isFinite(last) || far - last >= spacing * 0.75)) points.push(far);
  return points;
}

export function pairGridForStage(stage) {
  if (!stage) return { x: STAGE_GRID_X, y: STAGE_GRID_Y };
  const dimensions = normalizeStageDimensions(stage);
  if (!isDefaultStage(dimensions) && dimensions.width === 100 && dimensions.height === 100) {
    return { x: STAGE_GRID_X, y: STAGE_GRID_Y };
  }
  const metrics = pairMetricsForStage(dimensions);
  return {
    x: stageGridAxis(dimensions.width, metrics.spacing, 0.12),
    y: stageGridAxis(dimensions.height, metrics.spacing, 0.1)
  };
}

export function horizontalPairPositions(plan, firstId, secondId, center, stage = plan?.stage) {
  return findPairGridPlacement({
    plan,
    firstId,
    secondId,
    point: center,
    positions: {},
    excludeIds: [firstId, secondId],
    stage
  });
}

function pairSideIds(plan, firstId, secondId) {
  const first = plan.performers.find((performer) => performer.id === firstId);
  const second = plan.performers.find((performer) => performer.id === secondId);
  let leftId = firstId;
  let rightId = secondId;
  if ((first?.role === "groupB" || first?.role === LEGACY_GROUP_B_ROLE) && (second?.role === "groupA" || second?.role === LEGACY_GROUP_A_ROLE)) {
    leftId = secondId;
    rightId = firstId;
  }
  return { leftId, rightId };
}

export function findPairGridPlacement({
  plan,
  firstId,
  secondId,
  point,
  positions = {},
  excludeIds = [],
  stage,
  gridX,
  gridY
}) {
  if (!plan || !firstId || !secondId || firstId === secondId || !point) return null;
  const { leftId, rightId } = pairSideIds(plan, firstId, secondId);
  const grid = gridX && gridY ? { x: gridX, y: gridY } : pairGridForStage(stage);
  const metrics = pairMetricsForStage(stage);
  const candidates = [];
  grid.y.forEach((y) => {
    for (let index = 0; index < grid.x.length - 1; index += 1) {
      const left = { x: grid.x[index], y };
      const right = { x: grid.x[index + 1], y };
      if (distance(left, right) < metrics.collisionDistance) continue;
      const center = { x: (left.x + right.x) / 2, y };
      candidates.push({
        left,
        right,
        distance: distance(point, center),
        center
      });
    }
  });
  candidates.sort((a, b) => (
    a.distance - b.distance
      || Math.abs(a.center.y - point.y) - Math.abs(b.center.y - point.y)
      || Math.abs(a.center.x - point.x) - Math.abs(b.center.x - point.x)
      || a.center.y - b.center.y
      || a.center.x - b.center.x
  ));
  return candidates.reduce((match, candidate) => {
    if (match) return match;
    const proposed = {
      [leftId]: candidate.left,
      [rightId]: candidate.right
    };
    return pairPlacementCollides(positions, proposed, excludeIds, metrics.collisionDistance) ? null : proposed;
  }, null);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pairPlacementCollides(existingPositions, proposedPositions, movingIds = [], minimumGap = TOKEN_COLLISION_DISTANCE) {
  if (!proposedPositions) return false;
  const moving = new Set(movingIds);
  return Object.entries(proposedPositions).some(([proposedId, proposed]) => {
    if (!proposed) return false;
    return Object.entries(existingPositions || {}).some(([existingId, existing]) => {
      if (!existing || moving.has(existingId) || existingId === proposedId) return false;
      return distance(proposed, existing) < minimumGap;
    });
  });
}
