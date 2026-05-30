export const DEFAULT_STAGE_DIMENSIONS = Object.freeze({ width: 100, height: 100 });

export const STAGE_DIMENSION_LIMITS = Object.freeze({
  min: 40,
  max: 200,
  step: 5
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundDimension(value) {
  return Math.round(value * 10) / 10;
}

export function clampStageDimension(value, limits = STAGE_DIMENSION_LIMITS) {
  const number = finiteNumber(value, DEFAULT_STAGE_DIMENSIONS.width);
  return roundDimension(Math.max(limits.min, Math.min(limits.max, number)));
}

export function normalizeStageDimensions(stage = {}) {
  return {
    width: clampStageDimension(stage?.width ?? DEFAULT_STAGE_DIMENSIONS.width),
    height: clampStageDimension(stage?.height ?? DEFAULT_STAGE_DIMENSIONS.height)
  };
}

export function stageViewBox(stage = DEFAULT_STAGE_DIMENSIONS) {
  const dimensions = normalizeStageDimensions(stage);
  return `0 0 ${dimensions.width} ${dimensions.height}`;
}

export function clampStagePoint(point = {}, stage = DEFAULT_STAGE_DIMENSIONS) {
  const dimensions = normalizeStageDimensions(stage);
  return {
    x: Math.max(0, Math.min(dimensions.width, finiteNumber(point.x, 0))),
    y: Math.max(0, Math.min(dimensions.height, finiteNumber(point.y, 0)))
  };
}

function stagePointOutOfBounds(point, stage) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return true;
  return point.x < 0 || point.x > stage.width || point.y < 0 || point.y > stage.height;
}

function referencePoints(reference = {}) {
  if (reference.type === "point") return [{ x: reference.x, y: reference.y }];
  return [
    { x: reference.x1, y: reference.y1 },
    { x: reference.x2, y: reference.y2 }
  ];
}

function movementKeyframePositions(section = {}) {
  return Array.isArray(section.movementKeyframes)
    ? section.movementKeyframes.map((keyframe) => keyframe?.positions || {})
    : [];
}

export function collectOutOfBoundsStageItems(plan = {}, nextStage = DEFAULT_STAGE_DIMENSIONS) {
  const stage = normalizeStageDimensions(nextStage);
  const items = [];
  (plan.sections || []).forEach((section) => {
    const positionMaps = [section.positions || {}, ...movementKeyframePositions(section)];
    positionMaps.forEach((positions) => {
      Object.entries(positions).forEach(([performerId, point]) => {
        if (stagePointOutOfBounds(point, stage)) {
          items.push({
            type: "performer",
            performerId,
            sectionId: section.id || "",
            sectionName: section.name || ""
          });
        }
      });
    });
  });
  (plan.stageReferences || []).forEach((reference) => {
    if (referencePoints(reference).some((point) => stagePointOutOfBounds(point, stage))) {
      items.push({
        type: "reference",
        referenceId: reference.id || "",
        label: reference.label || reference.id || ""
      });
    }
  });
  return items;
}

export function canResizeStage(plan = {}, nextStage = DEFAULT_STAGE_DIMENSIONS) {
  const blockingItems = collectOutOfBoundsStageItems(plan, nextStage);
  return {
    ok: blockingItems.length === 0,
    blockingItems,
    stage: normalizeStageDimensions(nextStage)
  };
}

export function clientPointToStage(svg, event, stage = DEFAULT_STAGE_DIMENSIONS) {
  const dimensions = normalizeStageDimensions(stage);
  if (!svg) return { x: 0, y: 0 };
  const screenMatrix = svg.getScreenCTM?.();
  if (screenMatrix && svg.createSVGPoint) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return clampStagePoint(point.matrixTransform(screenMatrix.inverse()), dimensions);
  }
  const rect = svg.getBoundingClientRect();
  return clampStagePoint({
    x: ((event.clientX - rect.left) / rect.width) * dimensions.width,
    y: ((event.clientY - rect.top) / rect.height) * dimensions.height
  }, dimensions);
}
