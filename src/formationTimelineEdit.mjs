import { DEFAULT_FORMATION_SEGMENT_SECONDS, TIMELINE_TIME_STEP, clampFormationSpan, clampValue, pointMoveDuration, pointMoveStart, pointTime, quantizeTimelineDelta, quantizeTimelineTime } from "./timelineCore.mjs";

import { applySectionTiming, normalizeFormationSections, sortFormationSections } from "./formationTimeline.mjs";

const MIN_FORMATION_BLOCK_SECONDS = 0.5;

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

function sectionHoldDuration(section) {
  return quantizeTimelineDelta(Math.max(0, Number(section?.holdDuration) || DEFAULT_FORMATION_SEGMENT_SECONDS));
}

function minMoveDurationForIndex(index) {
  return index <= 0 ? 0 : MIN_FORMATION_BLOCK_SECONDS;
}

function sectionHoldEnd(normalized, index) {
  const nextSection = normalized[index + 1] || null;
  if (nextSection) return quantizeTimelineTime(pointMoveStart(nextSection));
  const section = normalized[index];
  return quantizeTimelineTime(pointTime(section) + sectionHoldDuration(section));
}

function setSectionMoveStart(section, nextStart, minMoveDuration = 0) {
  const end = quantizeTimelineTime(pointTime(section));
  const latestStart = quantizeTimelineTime(Math.max(0, end - Math.max(0, minMoveDuration)));
  return applySectionTiming(section, Math.min(latestStart, quantizeTimelineTime(nextStart)), end);
}

function setSectionArrival(section, nextArrival, minMoveDuration = 0) {
  const moveStart = quantizeTimelineTime(pointMoveStart(section));
  return applySectionTiming(section, moveStart, Math.max(moveStart + minMoveDuration, quantizeTimelineTime(nextArrival)));
}

function setLastSectionHoldStart(section, nextArrival, holdEnd, minMoveDuration = 0, minHoldDuration = 0) {
  const moveStart = quantizeTimelineTime(pointMoveStart(section));
  const latestArrival = quantizeTimelineTime(Math.max(moveStart + minMoveDuration, quantizeTimelineTime(holdEnd) - minHoldDuration));
  const arrival = quantizeTimelineTime(clampValue(Math.max(moveStart + minMoveDuration, nextArrival), moveStart + minMoveDuration, latestArrival));
  return {
    ...applySectionTiming(section, moveStart, arrival),
    holdDuration: quantizeTimelineDelta(Math.max(0, quantizeTimelineTime(holdEnd) - arrival))
  };
}

function setHoldRightEdgeWithPropagation(normalized, index, requestedHoldEnd) {
  const nextSections = [...normalized];
  const currentArrival = quantizeTimelineTime(pointTime(nextSections[index]));
  let holdEnd = quantizeTimelineTime(Math.max(currentArrival, requestedHoldEnd));
  let actualHoldEnd = holdEnd;

  for (let currentIndex = index; currentIndex < nextSections.length - 1; currentIndex += 1) {
    const nextIndex = currentIndex + 1;
    const nextSection = nextSections[nextIndex];
    const nextArrival = quantizeTimelineTime(pointTime(nextSection));
    const minMoveDuration = minMoveDurationForIndex(nextIndex);

    if (holdEnd <= nextArrival) {
      const nextStart = quantizeTimelineTime(Math.min(holdEnd, Math.max(0, nextArrival - minMoveDuration)));
      actualHoldEnd = nextStart;
      nextSections[nextIndex] = setSectionMoveStart(nextSection, nextStart, minMoveDuration);
      return { sections: nextSections, holdEnd: actualHoldEnd };
    }

    const nextMoveStart = holdEnd;
    const nextEnd = quantizeTimelineTime(nextMoveStart + minMoveDuration);
    const delta = quantizeTimelineDelta(nextEnd - nextArrival);
    nextSections[nextIndex] = applySectionTiming(nextSection, nextMoveStart, nextEnd);
    actualHoldEnd = nextMoveStart;
    holdEnd = quantizeTimelineTime(sectionHoldEnd(normalized, nextIndex) + delta);
  }

  return { sections: nextSections, holdEnd: actualHoldEnd };
}

// Action helpers keep all formation-time invariants behind the dispatcher.
function addFormationAfterEdit(normalized, { sectionId, section, time, forceSequentialAppend = false }) {
  const previous = normalized.at(-1) || null;
  const previousHoldEnd = previous ? sectionHoldEnd(normalized, normalized.length - 1) : 0;
  const requestedEnd = Number.isFinite(Number(time))
    ? quantizeTimelineTime(time)
    : quantizeTimelineTime(previousHoldEnd + DEFAULT_FORMATION_SEGMENT_SECONDS);
  const start = previous ? previousHoldEnd : 0;
  const end = forceSequentialAppend
    ? quantizeTimelineTime(start + DEFAULT_FORMATION_SEGMENT_SECONDS)
    : quantizeTimelineTime(Math.max(requestedEnd, start + DEFAULT_FORMATION_SEGMENT_SECONDS));
  const sectionPayload = section || { id: sectionId };
  const nextSection = applySectionTiming({
    ...sectionPayload,
    name: String(sectionPayload.name || "").trim() || "대형"
  }, start, end);
  const nextSections = normalizeFormationSections([...normalized, nextSection]);
  return { sections: nextSections, selectedSectionId: nextSection.id, statusKind: "added" };
}

function trimFormationLeftEdit(normalized, sectionId, index, time) {
  if (index === 0) return blockedFormationEdit(normalized, sectionId);

  const current = normalized[index];
  const end = quantizeTimelineTime(pointTime(current));
  const previousEnd = quantizeTimelineTime(pointTime(normalized[index - 1]));
  const nextStart = quantizeTimelineTime(clampValue(time, previousEnd, end - minMoveDurationForIndex(index)));
  const nextSections = normalized.map((item) => (
    item.id === sectionId ? applySectionTiming(item, nextStart, end) : item
  ));
  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated" };
}

function shiftFollowingSectionsForRightTrim(normalized, index, end, signedDelta) {
  let contiguousCursor = end;
  let shouldPullContiguous = signedDelta < 0;

  return normalized.map((item, itemIndex) => {
    if (itemIndex <= index) return item;
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
}

function trimFormationRightEdit(normalized, sectionId, index, time) {
  const current = normalized[index];
  const start = quantizeTimelineTime(pointMoveStart(current));
  const end = quantizeTimelineTime(pointTime(current));
  const requestedEnd = quantizeTimelineTime(Math.max(start + minMoveDurationForIndex(index), Number(time) || 0));
  const signedDelta = requestedEnd - end;
  const shiftedFollowing = shiftFollowingSectionsForRightTrim(normalized, index, end, signedDelta);
  const nextSections = shiftedFollowing.map((item, itemIndex) => (
    itemIndex === index ? applySectionTiming(item, start, requestedEnd) : item
  ));

  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated" };
}

function trimFormationHoldRightEdit(normalized, sectionId, index, time) {
  const nextSection = normalized[index + 1] || null;
  const current = normalized[index];
  const currentArrival = quantizeTimelineTime(pointTime(current));
  if (!nextSection) {
    const holdEnd = quantizeTimelineTime(Math.max(currentArrival + MIN_FORMATION_BLOCK_SECONDS, Number(time) || 0));
    const duration = quantizeTimelineDelta(holdEnd - currentArrival);
    const nextSections = normalized.map((item, itemIndex) => (
      itemIndex === index ? { ...item, holdDuration: duration } : item
    ));
    return {
      sections: normalizeFormationSections(nextSections),
      selectedSectionId: sectionId,
      statusKind: "updated",
      start: currentArrival,
      end: holdEnd,
      duration
    };
  }

  const holdEnd = quantizeTimelineTime(Math.max(currentArrival + MIN_FORMATION_BLOCK_SECONDS, Number(time) || 0));
  const result = setHoldRightEdgeWithPropagation(normalized, index, holdEnd);
  const actualHoldEnd = result.holdEnd;
  return {
    sections: normalizeFormationSections(result.sections),
    selectedSectionId: sectionId,
    statusKind: "updated",
    start: currentArrival,
    end: actualHoldEnd,
    duration: quantizeTimelineDelta(actualHoldEnd - currentArrival)
  };
}

function trimFormationHoldLeftEdit(normalized, sectionId, index, time) {
  const current = normalized[index];
  const nextSection = normalized[index + 1] || null;
  const moveStart = quantizeTimelineTime(pointMoveStart(current));
  const currentArrival = quantizeTimelineTime(pointTime(current));
  const holdEnd = nextSection
    ? quantizeTimelineTime(pointMoveStart(nextSection))
    : sectionHoldEnd(normalized, index);
  const minMoveDuration = minMoveDurationForIndex(index);
  const minHoldDuration = MIN_FORMATION_BLOCK_SECONDS;
  const nextArrival = quantizeTimelineTime(clampValue(Number(time) || 0, moveStart + minMoveDuration, holdEnd - minHoldDuration));
  const nextSections = normalized.map((item) => (
    item.id === sectionId
      ? nextSection
        ? applySectionTiming(item, moveStart, nextArrival)
        : setLastSectionHoldStart(item, nextArrival, holdEnd, minMoveDuration, minHoldDuration)
      : item
  ));
  return {
    sections: normalizeFormationSections(nextSections),
    selectedSectionId: sectionId,
    statusKind: "updated",
    start: nextArrival,
    end: holdEnd,
    duration: quantizeTimelineDelta(holdEnd - nextArrival)
  };
}

function bodyDragBounds(current, previousSection, nextSection, timelineMax) {
  const duration = quantizeTimelineDelta(pointMoveDuration(current));
  const start = quantizeTimelineTime(pointMoveStart(current));
  const end = quantizeTimelineTime(pointTime(current));
  return {
    duration,
    start,
    end,
    minStart: previousSection ? quantizeTimelineTime(pointTime(previousSection) + minMoveDurationForIndex(1)) : 0,
    maxEnd: nextSection ? quantizeTimelineTime(pointTime(nextSection) - minMoveDurationForIndex(1)) : quantizeTimelineTime(Math.max(Number(timelineMax) || 0, end))
  };
}

function moveFormationBodyEdit(normalized, sectionId, index, { deltaTime = 0, timelineMax = 0 } = {}) {
  const current = normalized[index];
  const previousSection = normalized[index - 1] || null;
  const nextSection = normalized[index + 1] || null;
  const bounds = bodyDragBounds(current, previousSection, nextSection, timelineMax);
  const holdStart = quantizeTimelineTime(pointTime(current));
  const holdEnd = sectionHoldEnd(normalized, index);
  const holdDuration = quantizeTimelineDelta(holdEnd - holdStart);
  const quantizedDeltaTime = Math.abs(quantizeTimelineDelta(deltaTime));
  const signedDelta = Number(deltaTime) < 0 ? -quantizedDeltaTime : quantizedDeltaTime;
  const rawStart = quantizeTimelineTime(holdStart + signedDelta);
  const rawEnd = quantizeTimelineTime(holdEnd + signedDelta);
  const maxEnd = nextSection
    ? quantizeTimelineTime(pointTime(nextSection) - minMoveDurationForIndex(1))
    : quantizeTimelineTime(Math.max(Number(timelineMax) || 0, rawEnd));
  const span = clampFormationSpan({ start: rawStart, duration: holdDuration, minStart: bounds.minStart, maxEnd });
  const dragBounds = {
    start: span.start,
    end: span.end,
    duration: span.duration,
    minStart: bounds.minStart,
    maxEnd
  };

  if (span.start !== rawStart || span.end !== rawEnd || span.start < bounds.minStart) {
    return blockedFormationEdit(normalized, sectionId, "blocked", dragBounds);
  }

  let nextSections = normalized.map((item, itemIndex) => (
    itemIndex === index
      ? nextSection
        ? setSectionArrival(item, rawStart, minMoveDurationForIndex(index))
        : setLastSectionHoldStart(item, rawStart, rawEnd, minMoveDurationForIndex(index), MIN_FORMATION_BLOCK_SECONDS)
      : item
  ));
  if (nextSection) {
    nextSections = setHoldRightEdgeWithPropagation(nextSections, index, rawEnd).sections;
  }
  return { sections: normalizeFormationSections(nextSections), selectedSectionId: sectionId, statusKind: "updated", start: rawStart, end: rawEnd, duration: holdDuration };
}

function reorderFormationEdit(normalized, sectionId, index, toIndex) {
  const movable = [...normalized];
  const [moving] = movable.splice(index, 1);
  const targetIndex = clampValue(Number(toIndex) || 0, 0, movable.length);
  movable.splice(targetIndex, 0, moving);
  let cursor = 0;
  const nextSections = movable.map((item, itemIndex) => {
    const duration = quantizeTimelineDelta(pointMoveDuration(item));
    const startTime = itemIndex === 0 ? 0 : cursor;
    const endTime = quantizeTimelineTime(startTime + duration);
    cursor = endTime;
    return applySectionTiming(item, startTime, endTime);
  });
  return { sections: nextSections, selectedSectionId: sectionId, statusKind: "updated" };
}

function swapFormationEdit(normalized, sectionId, index, targetSectionId) {
  const targetIndex = normalized.findIndex((item) => item.id === targetSectionId);
  if (targetIndex < 0 || targetIndex === index) {
    return blockedFormationEdit(normalized, sectionId, "blocked", { action: "blocked", label: "배치 불가" });
  }
  const swapped = [...normalized];
  [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
  let cursor = 0;
  const nextSections = swapped.map((item, itemIndex) => {
    const duration = quantizeTimelineDelta(pointMoveDuration(item));
    const startTime = itemIndex === 0 ? 0 : cursor;
    const endTime = quantizeTimelineTime(startTime + duration);
    cursor = endTime;
    return applySectionTiming(item, startTime, endTime);
  });
  return { sections: nextSections, selectedSectionId: sectionId, statusKind: "updated" };
}

function pointDropBlockForPointer(blocks, pointerContentPx, sourceSectionId) {
  const pointerPx = Math.max(0, Number(pointerContentPx) || 0);
  return (blocks || [])
    .filter((block) => (block?.kind || "hold") !== "move")
    .map((block) => {
      const leftPx = Math.max(0, Number(block.leftPx) || 0);
      const widthPx = Math.max(0, Number(block.hitWidthPx ?? block.widthPx) || 0);
      return {
        ...block,
        leftPx,
        widthPx,
        rightPx: leftPx + widthPx,
        sectionId: block.sectionId || block.toSectionId || block.fromSectionId || ""
      };
    })
    .filter((block) => block.sectionId && block.sectionId !== sourceSectionId && pointerPx >= block.leftPx && pointerPx <= block.rightPx)
    .sort((left, right) => (right.widthPx - left.widthPx) || (left.leftPx - right.leftPx))[0] || null;
}

function inferPointDropPixelsPerSecond(normalized, blocks) {
  for (const block of blocks || []) {
    const sectionId = block?.sectionId || block?.toSectionId || block?.fromSectionId || "";
    const index = normalized.findIndex((section) => section.id === sectionId);
    if (index < 0) continue;
    const nextSection = normalized[index + 1] || null;
    const holdStart = pointTime(normalized[index]);
    const holdEnd = nextSection ? pointMoveStart(nextSection) : holdStart + DEFAULT_FORMATION_SEGMENT_SECONDS;
    const duration = quantizeTimelineDelta(holdEnd - holdStart);
    const widthPx = Math.max(0, Number(block.hitWidthPx ?? block.widthPx) || 0);
    if (duration > 0 && widthPx > 0) return widthPx / duration;
  }
  return 56;
}

function pointDropBlockForPointerTime(normalized, blocks, pointerTime, sourceSectionId, timelineMax) {
  const time = quantizeTimelineTime(pointerTime);
  const pixelsPerSecond = inferPointDropPixelsPerSecond(normalized, blocks);
  for (let index = 0; index < normalized.length; index += 1) {
    const section = normalized[index];
    if (section.id === sourceSectionId) continue;
    const nextSection = normalized[index + 1] || null;
    const holdStart = quantizeTimelineTime(pointTime(section));
    const holdEnd = nextSection
      ? quantizeTimelineTime(pointMoveStart(nextSection))
      : quantizeTimelineTime(Math.max(pointTime(section) + DEFAULT_FORMATION_SEGMENT_SECONDS, Number(timelineMax) || 0));
    if (time < holdStart || time > holdEnd || holdEnd <= holdStart) continue;
    const existingBlock = (blocks || []).find((block) => (
      (block?.kind || "hold") !== "move" &&
      (block.sectionId || block.toSectionId || block.fromSectionId || "") === section.id
    ));
    const leftPx = Math.max(0, Number(existingBlock?.leftPx) || holdStart * pixelsPerSecond);
    const widthPx = Math.max(48, Number(existingBlock?.hitWidthPx ?? existingBlock?.widthPx) || (holdEnd - holdStart) * pixelsPerSecond);
    const pointerPx = leftPx + (time - holdStart) * pixelsPerSecond;
    return {
      ...(existingBlock || {}),
      sectionId: section.id,
      leftPx,
      widthPx,
      rightPx: leftPx + widthPx,
      pointerPx
    };
  }
  return null;
}

function pointDropPreviewGeometry(block, fallback = {}) {
  const leftPx = Math.max(0, Number(block?.leftPx ?? fallback.leftPx) || 0);
  const widthPx = Math.max(48, Number(block?.hitWidthPx ?? block?.widthPx ?? fallback.widthPx) || 48);
  return {
    leftPx,
    widthPx
  };
}

function pointDropBlocked(normalized, sectionId, extra = {}) {
  return blockedFormationEdit(normalized, sectionId, "blocked", {
    action: "blocked",
    label: "배치 불가",
    ...extra
  });
}

function moveFormationByPointerTime(normalized, sectionId, index, { pointerTime = 0, timelineMax = 0 } = {}) {
  const current = normalized[index];
  const previousSection = normalized[index - 1] || null;
  const nextSection = normalized[index + 1] || null;
  const bounds = bodyDragBounds(current, previousSection, nextSection, timelineMax);
  const end = quantizeTimelineTime(pointerTime);
  const isLastSection = !nextSection && previousSection;
  const start = isLastSection
    ? bounds.minStart
    : quantizeTimelineTime(Math.max(0, end - bounds.duration));
  const maxEnd = nextSection ? quantizeTimelineTime(pointMoveStart(nextSection)) : bounds.maxEnd;
  if (start < bounds.minStart || end > maxEnd || end < start || (start === bounds.start && end === bounds.end)) {
    return pointDropBlocked(normalized, sectionId, {
      start: bounds.start,
      end: bounds.end,
      duration: bounds.duration,
      minStart: bounds.minStart,
      maxEnd
    });
  }
  const nextSections = normalized.map((item) => (
    item.id === sectionId ? applySectionTiming(item, start, end) : item
  ));
  return {
    sections: normalizeFormationSections(nextSections),
    selectedSectionId: sectionId,
    statusKind: "updated",
    action: "time-move",
    label: "여기로 이동",
    start,
    end,
    duration: quantizeTimelineDelta(end - start)
  };
}

export function resolveFormationPointDrop({
  sections = [],
  sectionId,
  pointerTime = 0,
  pointerContentPx = 0,
  blocks = [],
  edgePx = 28,
  timelineMax = 0
} = {}) {
  const normalized = normalizeFormationSections(sections);
  const index = normalized.findIndex((item) => item.id === sectionId);
  if (index < 0) return pointDropBlocked(normalized, sectionId);

  const safeEdgePx = Math.max(0, Number(edgePx) || 0);
  const targetBlock = pointDropBlockForPointer(blocks, pointerContentPx, sectionId)
    || pointDropBlockForPointerTime(normalized, blocks, pointerTime, sectionId, timelineMax);
  if (!targetBlock) {
    return moveFormationByPointerTime(normalized, sectionId, index, { pointerTime, timelineMax });
  }

  const pointerPx = Math.max(0, Number(pointerContentPx) || 0);
  const targetPointerPx = Number.isFinite(Number(targetBlock.pointerPx)) ? Number(targetBlock.pointerPx) : pointerPx;
  const targetSectionId = targetBlock.sectionId;
  const leftDistance = targetPointerPx - targetBlock.leftPx;
  const rightDistance = targetBlock.rightPx - targetPointerPx;
  const targetEdgePx = Math.min(safeEdgePx, targetBlock.widthPx / 2);

  if (leftDistance <= targetEdgePx || rightDistance <= targetEdgePx) {
    const edge = leftDistance <= targetEdgePx ? "before" : "after";
    const targetIndexWithoutMoving = normalized
      .filter((item) => item.id !== sectionId)
      .findIndex((item) => item.id === targetSectionId);
    const toIndex = targetIndexWithoutMoving + (edge === "after" ? 1 : 0);
    if (targetIndexWithoutMoving < 0 || toIndex === index) {
      return pointDropBlocked(normalized, sectionId, { targetSectionId, edge, previewGeometry: pointDropPreviewGeometry(targetBlock) });
    }
    return {
      ...reorderFormationEdit(normalized, sectionId, index, toIndex),
      action: "insert",
      targetSectionId,
      edge,
      toIndex,
      label: "여기에 삽입",
      previewGeometry: pointDropPreviewGeometry(targetBlock)
    };
  }

  return {
    ...swapFormationEdit(normalized, sectionId, index, targetSectionId),
    action: "swap",
    targetSectionId,
    label: "교체",
    previewGeometry: pointDropPreviewGeometry(targetBlock)
  };
}

// Dispatcher is the only supported entry point for formation timeline edits.
export function applyFormationTimelineEdit({
  sections = [],
  action,
  sectionId,
  time,
  deltaTime = 0,
  toIndex,
  section = null,
  timelineMax = 0,
  reorderThresholdRatio = 2 / 3,
  forceSequentialAppend = false
} = {}) {
  const normalized = normalizeFormationSections(sections);
  const index = normalized.findIndex((item) => item.id === sectionId);

  if (action === "add-after") {
    return addFormationAfterEdit(normalized, { sectionId, section, time, forceSequentialAppend });
  }

  if (index < 0) return blockedFormationEdit(normalized, sectionId);

  if (action === "trim-left") {
    return trimFormationLeftEdit(normalized, sectionId, index, time);
  }

  if (action === "trim-right") {
    return trimFormationRightEdit(normalized, sectionId, index, time);
  }

  if (action === "trim-hold-right") {
    return trimFormationHoldRightEdit(normalized, sectionId, index, time);
  }

  if (action === "trim-hold-left") {
    return trimFormationHoldLeftEdit(normalized, sectionId, index, time);
  }

  if (action === "move-body") {
    return moveFormationBodyEdit(normalized, sectionId, index, { deltaTime, timelineMax, reorderThresholdRatio });
  }

  if (action === "reorder") {
    return reorderFormationEdit(normalized, sectionId, index, toIndex);
  }

  return blockedFormationEdit(normalized, sectionId);
}

// Compatibility wrappers preserve the older test/import surface while delegating to the dispatcher.
export function trimFormationSegment({ sections = [], sectionId, edge, time, timelineMax = 0 }) {
  const action = edge === "left" ? "trim-left" : edge === "right" ? "trim-right" : "";
  return applyFormationTimelineEdit({ sections, action, sectionId, time, timelineMax }).sections;
}

export function resolveFormationReorderIndex({ sections = [], sectionId, time }) {
  const sortedSections = [...sections].sort((a, b) => pointTime(a) - pointTime(b));
  const currentIndex = sortedSections.findIndex((section) => section.id === sectionId);
  if (currentIndex < 0) return currentIndex;

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
