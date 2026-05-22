export const COUPLE_GRID_SPACING = 8.8;
export const PAIR_HANDLE_OFFSET = 6.4;
export const TOKEN_COLLISION_DISTANCE = 8.4;

export function pairHandlePosition(midpoint) {
  return {
    x: midpoint.x,
    y: midpoint.y - PAIR_HANDLE_OFFSET
  };
}

export function horizontalCouplePositions(plan, firstId, secondId, center) {
  const first = plan.performers.find((performer) => performer.id === firstId);
  const second = plan.performers.find((performer) => performer.id === secondId);
  let leftId = firstId;
  let rightId = secondId;
  if (first?.role === "female" && second?.role === "male") {
    leftId = secondId;
    rightId = firstId;
  }
  const half = COUPLE_GRID_SPACING / 2;
  const safeCenter = {
    x: Math.min(Math.max(center.x, 4 + half), 96 - half),
    y: Math.min(Math.max(center.y, 5), 95)
  };
  return {
    [leftId]: { x: safeCenter.x - half, y: safeCenter.y },
    [rightId]: { x: safeCenter.x + half, y: safeCenter.y }
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pairPlacementCollides(existingPositions, proposedPositions, movingIds = [], minimumGap = TOKEN_COLLISION_DISTANCE) {
  const moving = new Set(movingIds);
  return Object.entries(proposedPositions).some(([proposedId, proposed]) => {
    if (!proposed) return false;
    return Object.entries(existingPositions || {}).some(([existingId, existing]) => {
      if (!existing || moving.has(existingId) || existingId === proposedId) return false;
      return distance(proposed, existing) < minimumGap;
    });
  });
}
