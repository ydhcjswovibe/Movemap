export const COUPLE_GRID_SPACING = 8.8;
export const TOKEN_COLLISION_DISTANCE = 8.4;
export const STAGE_GRID_X = [14.8, 23.6, 32.4, 41.2, 50, 58.8, 67.6, 76.4, 85.2];
export const STAGE_GRID_Y = [10.8, 19.6, 28.4, 37.2, 46, 54.8, 63.6, 72.4, 81.2, 90];

export function horizontalCouplePositions(plan, firstId, secondId, center) {
  return findCoupleGridPlacement({
    plan,
    firstId,
    secondId,
    point: center,
    positions: {},
    excludeIds: [firstId, secondId]
  });
}

function coupleSideIds(plan, firstId, secondId) {
  const first = plan.performers.find((performer) => performer.id === firstId);
  const second = plan.performers.find((performer) => performer.id === secondId);
  let leftId = firstId;
  let rightId = secondId;
  if (first?.role === "female" && second?.role === "male") {
    leftId = secondId;
    rightId = firstId;
  }
  return { leftId, rightId };
}

export function findCoupleGridPlacement({
  plan,
  firstId,
  secondId,
  point,
  positions = {},
  excludeIds = [],
  gridX = STAGE_GRID_X,
  gridY = STAGE_GRID_Y
}) {
  if (!plan || !firstId || !secondId || firstId === secondId || !point) return null;
  const { leftId, rightId } = coupleSideIds(plan, firstId, secondId);
  const candidates = [];
  gridY.forEach((y) => {
    for (let index = 0; index < gridX.length - 1; index += 1) {
      const left = { x: gridX[index], y };
      const right = { x: gridX[index + 1], y };
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
    return pairPlacementCollides(positions, proposed, excludeIds) ? null : proposed;
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
