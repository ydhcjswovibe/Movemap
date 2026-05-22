export const COUPLE_GRID_SPACING = 8.8;

export function horizontalCouplePositions(plan, firstId, secondId, center) {
  const first = plan.performers.find((performer) => performer.id === firstId);
  const second = plan.performers.find((performer) => performer.id === secondId);
  let leftId = firstId;
  let rightId = secondId;
  if (first?.role === "female" && second?.role === "male") {
    leftId = secondId;
    rightId = firstId;
  }
  const half = COUPLE_GRID_SPACING;
  const safeCenter = {
    x: Math.min(Math.max(center.x, 4 + half), 96 - half),
    y: Math.min(Math.max(center.y, 5), 95)
  };
  return {
    [leftId]: { x: safeCenter.x - half, y: safeCenter.y },
    [rightId]: { x: safeCenter.x + half, y: safeCenter.y }
  };
}
