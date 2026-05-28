export function timeToPercent(time, duration) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (!safeDuration) return 0;
  return Math.min(100, Math.max(0, ((Number(time) || 0) / safeDuration) * 100));
}

export function clampValue(value, min, max) {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.min(safeMax, Math.max(safeMin, value));
}

export const TIMELINE_TIME_STEP = 0.1;
export const DEFAULT_FORMATION_SEGMENT_SECONDS = 4;

function quantizeTimelineDelta(value, step = TIMELINE_TIME_STEP) {
  const safeStep = Math.max(0.001, Number(step) || TIMELINE_TIME_STEP);
  const numeric = Number(value) || 0;
  const scaled = numeric / safeStep;
  return Number((Math.round(scaled + Math.sign(scaled || 1) * 1e-9) * safeStep).toFixed(6));
}

export function quantizeTimelineTime(value, step = TIMELINE_TIME_STEP) {
  return Math.max(0, quantizeTimelineDelta(value, step));
}

export function timeToPixels(time, pixelsPerSecond) {
  return Math.max(0, Number(time) || 0) * Math.max(1, Number(pixelsPerSecond) || 1);
}

export function pixelsToTime(pixels, pixelsPerSecond) {
  return Math.max(0, Number(pixels) || 0) / Math.max(1, Number(pixelsPerSecond) || 1);
}

export function calculateTimelineMaxScrollX(duration, pixelsPerSecond, viewportWidth) {
  return Math.max(0, timeToPixels(duration, pixelsPerSecond) - Math.max(0, Number(viewportWidth) || 0));
}

export function calculateAnchoredZoomScrollX({ scrollX, cursorViewportX, currentZoom, nextZoom, timelineDuration, viewportWidth }) {
  if (!Number.isFinite(currentZoom) || currentZoom <= 0 || !Number.isFinite(nextZoom) || nextZoom <= 0) {
    return Math.max(0, Number(scrollX) || 0);
  }
  const cursorTime = pixelsToTime((Number(scrollX) || 0) + (Number(cursorViewportX) || 0), currentZoom);
  const nextScrollX = timeToPixels(cursorTime, nextZoom) - (Number(cursorViewportX) || 0);
  return clampValue(nextScrollX, 0, calculateTimelineMaxScrollX(timelineDuration, nextZoom, viewportWidth));
}

export function normalizeWheelDelta(delta, deltaMode) {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * 120;
  return delta;
}

export function pointTime(point) {
  return Number.isFinite(Number(point?.time)) ? Number(point.time) : Number(point?.end) || 0;
}

export function pointMoveDuration(point) {
  if (Number.isFinite(Number(point?.moveDuration))) return Math.max(0, Number(point.moveDuration));
  if (point?.moveMode === "hold") return 0;
  return Math.max(0, (Number(point?.end) || 0) - (Number(point?.start) || 0));
}

export function pointMoveStart(point) {
  return Math.max(0, pointTime(point) - pointMoveDuration(point));
}

function sortFormationSections(sections = []) {
  return [...sections].sort((a, b) => pointTime(a) - pointTime(b));
}

function applySectionTiming(section, start, end) {
  const nextStart = quantizeTimelineTime(start);
  const nextEnd = quantizeTimelineTime(Math.max(nextStart, end));
  return {
    ...section,
    start: nextStart,
    end: nextEnd,
    time: nextEnd,
    moveDuration: quantizeTimelineDelta(nextEnd - nextStart)
  };
}

function normalizeFormationSections(sections = []) {
  let previousEnd = 0;
  return sortFormationSections(sections).map((section, index) => {
    const rawEnd = quantizeTimelineTime(pointTime(section));
    const rawStart = index === 0 ? 0 : quantizeTimelineTime(pointMoveStart(section));
    const start = quantizeTimelineTime(Math.max(previousEnd, rawStart));
    const end = quantizeTimelineTime(Math.max(start, rawEnd));
    previousEnd = end;
    return applySectionTiming(section, start, end);
  });
}

export function clampMovementKeyframeT(value) {
  return clampValue(Number(value) || 0, 0, 1);
}

export function normalizeMovementKeyframes(keyframes = []) {
  return [...keyframes]
    .filter((keyframe) => keyframe && typeof keyframe === "object")
    .map((keyframe) => ({
      ...keyframe,
      t: clampMovementKeyframeT(keyframe.t)
    }))
    .sort((left, right) => left.t - right.t);
}

export function movementKeyframeTime(section, keyframe) {
  return pointMoveStart(section) + pointMoveDuration(section) * clampMovementKeyframeT(keyframe?.t);
}

export function movementKeyframePositions(section, keyframe) {
  return {
    ...(section?.positions || {}),
    ...(keyframe?.positions || {})
  };
}

export function applyMovementKeyframePositionPatch(keyframes = [], keyframeId, fallbackPositions = {}, patch = {}) {
  return normalizeMovementKeyframes(keyframes).map((keyframe) => {
    if (keyframe.id !== keyframeId) return keyframe;
    return {
      ...keyframe,
      positions: {
        ...fallbackPositions,
        ...(keyframe.positions || {}),
        ...patch
      }
    };
  });
}

export function clampFormationSpan({ start, duration, minStart = 0, maxEnd = 0 }) {
  const safeMinStart = Math.max(0, Number(minStart) || 0);
  const safeMaxEnd = Math.max(safeMinStart, Number(maxEnd) || safeMinStart);
  const safeDuration = Math.min(Math.max(0, Number(duration) || 0), safeMaxEnd - safeMinStart);
  const latestStart = Math.max(safeMinStart, safeMaxEnd - safeDuration);
  const safeStart = clampValue(Number(start) || 0, safeMinStart, latestStart);
  return {
    start: safeStart,
    end: safeStart + safeDuration,
    duration: safeDuration
  };
}

export function clampFormationTiming({ sections = [], sectionId, time, moveDuration, timelineMax = 0 }) {
  const sortedSections = [...sections].sort((a, b) => pointTime(a) - pointTime(b));
  const sectionIndex = sortedSections.findIndex((section) => section.id === sectionId);
  const currentSection = sortedSections[sectionIndex] || {};
  const previousTime = sectionIndex > 0 ? pointTime(sortedSections[sectionIndex - 1]) : 0;
  const nextSection = sectionIndex >= 0 ? sortedSections[sectionIndex + 1] : null;
  const fallbackMax = Math.max(previousTime, pointTime(currentSection), Number(timelineMax) || 0);
  const nextMoveStart = nextSection ? pointMoveStart(nextSection) : fallbackMax;
  const requestedMoveDuration = moveDuration === null || moveDuration === undefined
    ? pointMoveDuration(currentSection)
    : Math.max(0, Number(moveDuration) || 0);
  const latestArrival = Math.max(previousTime, nextMoveStart);
  const maxMoveDuration = Math.max(0, latestArrival - previousTime);
  const safeMoveDuration = Math.min(maxMoveDuration, requestedMoveDuration);
  const safeTime = clampValue(Number(time) || 0, previousTime + safeMoveDuration, latestArrival);
  return {
    time: safeTime,
    moveDuration: safeMoveDuration,
    start: Math.max(0, safeTime - safeMoveDuration),
    end: safeTime
  };
}

export function formationTimelineLabel(index) {
  return `F${index + 1}`;
}

export function formationTimelineBlock(section, index, duration) {
  const arrivalTime = pointTime(section);
  const moveStart = Math.min(arrivalTime, pointMoveStart(section));
  const leftTime = index === 0 ? 0 : moveStart;
  const arrivalPercent = index === 0 ? 0 : timeToPercent(arrivalTime, duration);
  const leftPercent = timeToPercent(leftTime, duration);
  return {
    isMarker: index === 0,
    leftPercent,
    arrivalPercent,
    widthPercent: index === 0 ? 0 : Math.max(0, arrivalPercent - leftPercent)
  };
}

export function formationTimelinePixels(section, index, pixelsPerSecond) {
  const arrivalTime = pointTime(section);
  const moveStart = Math.min(arrivalTime, pointMoveStart(section));
  const leftTime = index === 0 ? 0 : moveStart;
  const leftPx = timeToPixels(leftTime, pixelsPerSecond);
  const arrivalPx = index === 0 ? 0 : timeToPixels(arrivalTime, pixelsPerSecond);
  return {
    sectionId: section?.id,
    isMarker: index === 0,
    leftPx,
    arrivalPx,
    widthPx: index === 0 ? 0 : Math.max(0, arrivalPx - leftPx)
  };
}

export function layoutFormationBlocks(sections = [], pixelsPerSecond, options = {}) {
  const markerWidthPx = Math.max(0, Number(options.markerWidthPx) || 68);
  const markerGapPx = Math.max(0, Number(options.markerGapPx) || 4);
  const minSegmentWidthPx = Math.max(0, Number(options.minSegmentWidthPx) || 0);
  const visualGapPx = Math.max(0, Number(options.visualGapPx) || 0);
  const introAsSegment = options.introAsSegment === true;
  const timelineStartOffsetPx = sections.length > 1 && !introAsSegment ? markerWidthPx + markerGapPx : 0;
  let visualCursorPx = 0;

  return sections.map((section, index) => {
    const block = formationTimelinePixels(section, index, pixelsPerSecond);
    const displayStartTime = index === 0 ? 0 : pointMoveStart(section);
    const displayEndTime = introAsSegment && index === 0
      ? pointTime(section)
      : pointTime(section);
    const introWidthPx = introAsSegment && index === 0
      ? timeToPixels(displayEndTime, pixelsPerSecond)
      : block.widthPx;
    const isMarker = block.isMarker && !(introAsSegment && index === 0);
    const widthPx = Math.max(0, introWidthPx);
    const isTick = !block.isMarker && block.widthPx === 0;
    const hitWidthPx = isMarker
      ? markerWidthPx
      : isTick ? 0 : Math.max(widthPx, minSegmentWidthPx);
    const logicalLeftPx = block.leftPx;
    const baseLeftPx = isMarker ? block.leftPx : block.leftPx + timelineStartOffsetPx;
    const leftPx = minSegmentWidthPx > 0 && !isTick
      ? Math.max(baseLeftPx, visualCursorPx)
      : baseLeftPx;
    if (!isTick) visualCursorPx = Math.max(visualCursorPx, leftPx + hitWidthPx + visualGapPx);
    return {
      ...block,
      isMarker,
      leftPx,
      logicalLeftPx,
      arrivalPx: isMarker ? block.arrivalPx : block.arrivalPx + timelineStartOffsetPx,
      widthPx,
      displayStartTime,
      displayEndTime,
      isTick,
      row: 0,
      hitWidthPx,
      visualRightPx: leftPx + hitWidthPx
    };
  });
}

export function resolveFormationAddTarget(sections, captureTime, options = {}) {
  const existingTolerance = Math.max(0, Number(options.existingTolerance) || 0.15);
  const sortedSections = [...(sections || [])].sort((a, b) => pointTime(a) - pointTime(b));
  const time = Math.max(0, Number(captureTime) || 0);
  const existing = sortedSections.find((section) => Math.abs(pointTime(section) - time) <= existingTolerance);
  if (existing) return { action: "select", section: existing };

  const previous = sortedSections.at(-1) || null;
  return {
    action: "append",
    previous,
    time
  };
}

export function buildTimelineTicks(duration, options = {}) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const pixelsPerSecond = Math.max(0, Number(options.pixelsPerSecond) || 0);
  const scrollX = Math.max(0, Number(options.scrollX) || 0);
  const viewportWidth = Math.max(0, Number(options.viewportWidth) || 0);
  const targetPixelSpacing = 88;
  const rawInterval = pixelsPerSecond ? targetPixelSpacing / pixelsPerSecond : 0;
  const interval = pixelsPerSecond
    ? rawInterval <= 0.5 ? 0.5 : rawInterval <= 1 ? 1 : rawInterval <= 2 ? 2 : rawInterval <= 5 ? 5 : rawInterval <= 10 ? 10 : 30
    : safeDuration <= 30 ? 5 : safeDuration <= 90 ? 10 : 30;
  const ticks = [];
  const startTime = pixelsPerSecond && viewportWidth ? Math.max(0, Math.floor(pixelsToTime(scrollX, pixelsPerSecond) / interval) * interval) : 0;
  const endTime = pixelsPerSecond && viewportWidth ? Math.min(safeDuration, pixelsToTime(scrollX + viewportWidth, pixelsPerSecond) + interval) : safeDuration;
  for (let time = startTime; time <= endTime + 0.0001; time += interval) {
    const roundedTime = Math.round(time * 10) / 10;
    ticks.push({
      time: roundedTime,
      label: interval < 1 ? `${roundedTime.toFixed(1)}s` : `${Math.round(roundedTime)}s`,
      percent: timeToPercent(roundedTime, safeDuration),
      pixel: timeToPixels(roundedTime, pixelsPerSecond || safeDuration)
    });
  }
  if (!pixelsPerSecond && !ticks.some((tick) => tick.time === safeDuration)) {
    ticks.push({ time: safeDuration, label: `${Math.round(safeDuration)}s`, percent: 100, pixel: safeDuration });
  }
  return ticks;
}

export function snapFormationTime(rawTime, options = {}) {
  const minTime = Math.max(0, Number(options.minTime) || 0);
  const maxTime = Math.max(minTime, Number(options.maxTime) || minTime);
  const boundedTime = clampValue(quantizeTimelineTime(rawTime), minTime, maxTime);
  if (options.enabled === false) return { time: boundedTime, snapped: false };

  const threshold = Math.max(0, Number(options.threshold) || 0.18);
  const candidates = [];
  const addCandidate = (time, type, priority) => {
    const value = quantizeTimelineTime(time);
    if (!Number.isFinite(value) || value < minTime || value > maxTime) return;
    candidates.push({ time: value, type, priority, distance: Math.abs(value - boundedTime) });
  };

  for (const section of options.sections || []) {
    if (section?.id === options.sectionId) continue;
    addCandidate(pointMoveStart(section), "formation-start", 0);
    addCandidate(pointTime(section), "formation-arrival", 0);
  }
  addCandidate(options.playheadTime, "playhead", 1);
  const gridSize = Math.max(0, Number(options.gridSize) || 0);
  if (gridSize) addCandidate(quantizeTimelineTime(boundedTime, gridSize), "grid", 2);

  const best = candidates
    .filter((candidate) => candidate.distance <= threshold)
    .sort((left, right) => left.distance - right.distance || left.priority - right.priority)[0];
  if (!best) return { time: boundedTime, snapped: false };
  return { time: best.time, snapped: true, snapPoint: { time: best.time, type: best.type } };
}

function blockedFormationEdit(sections, sectionId, statusKind = "blocked", extra = {}) {
  return {
    sections: normalizeFormationSections(sections),
    selectedSectionId: sectionId,
    statusKind,
    ...extra
  };
}

function shiftSection(section, deltaTime) {
  const duration = quantizeTimelineDelta(pointMoveDuration(section));
  const end = quantizeTimelineTime(pointTime(section) + deltaTime);
  return applySectionTiming(section, Math.max(0, end - duration), end);
}

function addFormationAfterEdit(normalized, { sectionId, section, time }) {
  const previous = normalized.at(-1) || null;
  const previousEnd = previous ? pointTime(previous) : 0;
  const duration = DEFAULT_FORMATION_SEGMENT_SECONDS;
  const requestedEnd = Number.isFinite(Number(time)) ? quantizeTimelineTime(time) : quantizeTimelineTime(previousEnd + duration);
  const end = quantizeTimelineTime(Math.max(previousEnd + duration, requestedEnd));
  const start = quantizeTimelineTime(end - duration);
  const nextSection = applySectionTiming(section || { id: sectionId }, start, end);
  const nextSections = normalizeFormationSections([...normalized, nextSection]);
  return { sections: nextSections, selectedSectionId: nextSection.id, statusKind: "added" };
}

function trimFormationLeftEdit(normalized, sectionId, index, time) {
  if (index === 0) return blockedFormationEdit(normalized, sectionId);

  const current = normalized[index];
  const end = quantizeTimelineTime(pointTime(current));
  const previousEnd = quantizeTimelineTime(pointTime(normalized[index - 1]));
  const nextStart = quantizeTimelineTime(clampValue(time, previousEnd, end));
  const nextSections = normalized.map((item) => (
    item.id === sectionId ? applySectionTiming(item, nextStart, end) : item
  ));
  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated" };
}

function trimFormationRightEdit(normalized, sectionId, index, time) {
  const current = normalized[index];
  const start = quantizeTimelineTime(pointMoveStart(current));
  const end = quantizeTimelineTime(pointTime(current));
  const requestedEnd = quantizeTimelineTime(Math.max(start, Number(time) || 0));
  const signedDelta = requestedEnd - end;
  let contiguousCursor = end;
  let shouldPullContiguous = signedDelta < 0;

  const nextSections = normalized.map((item, itemIndex) => {
    if (itemIndex < index) return item;
    if (itemIndex === index) return applySectionTiming(item, start, requestedEnd);
    if (signedDelta > 0) return shiftSection(item, signedDelta);
    if (!shouldPullContiguous) return item;
    const itemStart = quantizeTimelineTime(pointMoveStart(item));
    if (Math.abs(itemStart - contiguousCursor) > TIMELINE_TIME_STEP / 2) {
      shouldPullContiguous = false;
      return item;
    }
    contiguousCursor = quantizeTimelineTime(pointTime(item));
    return shiftSection(item, signedDelta);
  });

  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated" };
}

function moveFormationBodyEdit(normalized, sectionId, index, { deltaTime = 0, timelineMax = 0, reorderThresholdRatio = 2 / 3 } = {}) {
  if (index === 0) return blockedFormationEdit(normalized, sectionId);

  const current = normalized[index];
  const duration = quantizeTimelineDelta(pointMoveDuration(current));
  const start = quantizeTimelineTime(pointMoveStart(current));
  const end = quantizeTimelineTime(pointTime(current));
  const previousSection = normalized[index - 1] || null;
  const nextSection = normalized[index + 1] || null;
  const minStart = previousSection ? quantizeTimelineTime(pointTime(previousSection)) : 0;
  const maxEnd = nextSection ? quantizeTimelineTime(pointMoveStart(nextSection)) : quantizeTimelineTime(Math.max(Number(timelineMax) || 0, end));
  const quantizedDeltaTime = Math.abs(quantizeTimelineDelta(deltaTime));
  const signedDelta = Number(deltaTime) < 0 ? -quantizedDeltaTime : quantizedDeltaTime;
  const rawStart = quantizeTimelineTime(start + signedDelta);
  const rawEnd = quantizeTimelineTime(end + signedDelta);
  const thresholdRatio = clampValue(Number(reorderThresholdRatio) || 0, 0, 1);
  const span = clampFormationSpan({ start: rawStart, duration, minStart, maxEnd });
  const dragBounds = {
    start: span.start,
    end: span.end,
    duration: span.duration
  };

  if (rawStart < minStart && previousSection && index > 1) {
    const previousStart = quantizeTimelineTime(pointMoveStart(previousSection));
    const previousDuration = quantizeTimelineDelta(pointMoveDuration(previousSection));
    const threshold = quantizeTimelineTime(previousStart + previousDuration * (1 - thresholdRatio));
    if (rawStart <= threshold) return blockedFormationEdit(normalized, sectionId, "reorder-preview", { ...dragBounds, toIndex: index - 1 });
  }

  if (rawEnd > maxEnd && nextSection) {
    const nextStart = quantizeTimelineTime(pointMoveStart(nextSection));
    const nextDuration = quantizeTimelineDelta(pointMoveDuration(nextSection));
    const threshold = quantizeTimelineTime(nextStart + nextDuration * thresholdRatio);
    if (rawEnd >= threshold) return blockedFormationEdit(normalized, sectionId, "reorder-preview", { ...dragBounds, toIndex: index + 1 });
  }

  if (span.start !== rawStart || span.end !== rawEnd) {
    return blockedFormationEdit(normalized, sectionId, "blocked", dragBounds);
  }

  const nextSections = normalized.map((item) => (
    item.id === sectionId ? applySectionTiming(item, rawStart, rawEnd) : item
  ));
  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated", start: rawStart, end: rawEnd, duration };
}

function reorderFormationEdit(normalized, sectionId, index, toIndex) {
  if (index === 0) return blockedFormationEdit(normalized, sectionId);

  const movable = [...normalized];
  const [moving] = movable.splice(index, 1);
  const targetIndex = clampValue(Number(toIndex) || 0, 1, movable.length);
  movable.splice(targetIndex, 0, moving);
  let cursor = 0;
  const nextSections = movable.map((item, itemIndex) => {
    const duration = itemIndex === 0
      ? quantizeTimelineDelta(pointTime(item))
      : quantizeTimelineDelta(pointMoveDuration(item));
    const startTime = itemIndex === 0 ? 0 : cursor;
    const endTime = quantizeTimelineTime(startTime + duration);
    cursor = endTime;
    return applySectionTiming(item, startTime, endTime);
  });
  return { sections: nextSections, selectedSectionId: sectionId, statusKind: "updated" };
}

export function applyFormationTimelineEdit({
  sections = [],
  action,
  sectionId,
  time,
  deltaTime = 0,
  toIndex,
  section = null,
  timelineMax = 0,
  reorderThresholdRatio = 2 / 3
} = {}) {
  const normalized = normalizeFormationSections(sections);
  const index = normalized.findIndex((item) => item.id === sectionId);

  if (action === "add-after") {
    return addFormationAfterEdit(normalized, { sectionId, section, time });
  }

  if (index < 0) return blockedFormationEdit(normalized, sectionId);

  if (action === "trim-left") {
    return trimFormationLeftEdit(normalized, sectionId, index, time);
  }

  if (action === "trim-right") {
    return trimFormationRightEdit(normalized, sectionId, index, time);
  }

  if (action === "move-body") {
    return moveFormationBodyEdit(normalized, sectionId, index, { deltaTime, timelineMax, reorderThresholdRatio });
  }

  if (action === "reorder") {
    return reorderFormationEdit(normalized, sectionId, index, toIndex);
  }

  return blockedFormationEdit(normalized, sectionId);
}

export function trimFormationSegment({ sections = [], sectionId, edge, time, timelineMax = 0 }) {
  const action = edge === "left" ? "trim-left" : edge === "right" ? "trim-right" : "";
  return applyFormationTimelineEdit({ sections, action, sectionId, time, timelineMax }).sections;
}

export function resolveFormationReorderIndex({ sections = [], sectionId, time }) {
  const sortedSections = [...sections].sort((a, b) => pointTime(a) - pointTime(b));
  const currentIndex = sortedSections.findIndex((section) => section.id === sectionId);
  if (currentIndex < 0) return currentIndex;
  if (currentIndex === 0) return 0;

  const movable = sortedSections.filter((section) => section.id !== sectionId);
  const targetTime = Math.max(0, Number(time) || 0);
  let toIndex = movable.length;
  for (let index = 0; index < movable.length; index += 1) {
    const midpoint = pointMoveStart(movable[index]) + pointMoveDuration(movable[index]) / 2;
    if (targetTime < midpoint) {
      toIndex = index;
      break;
    }
  }
  return toIndex;
}

export function resolveFormationBodyDrag({ sections = [], sectionId, deltaTime = 0, timelineMax = 0, reorderThresholdRatio = 2 / 3 }) {
  const normalized = normalizeFormationSections(sections);
  const index = normalized.findIndex((section) => section.id === sectionId);
  if (index < 0) {
    return { action: "blocked", index, start: 0, end: 0, duration: 0, toIndex: null };
  }

  const result = applyFormationTimelineEdit({
    sections: normalized,
    action: "move-body",
    sectionId,
    deltaTime,
    timelineMax,
    reorderThresholdRatio
  });
  const section = result.sections.find((item) => item.id === sectionId) || normalized[index];
  return {
    action: result.statusKind === "updated" ? "move" : result.statusKind,
    index,
    start: result.start ?? quantizeTimelineTime(pointMoveStart(section)),
    end: result.end ?? quantizeTimelineTime(pointTime(section)),
    duration: result.duration ?? quantizeTimelineDelta(pointMoveDuration(section)),
    toIndex: result.toIndex ?? null
  };
}

export function reorderFormationSegments({ sections = [], sectionId, toIndex }) {
  return applyFormationTimelineEdit({ sections, action: "reorder", sectionId, toIndex }).sections;
}

export function buildWaveformBars(count = 96) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.55) * 0.5 + Math.sin(index * 0.17) * 0.35;
    return Math.max(0.18, Math.min(1, Math.abs(wave)));
  });
}
