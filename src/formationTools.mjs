import { normalizeStageDimensions } from "./stageGeometry.mjs";

function byPointTime(section) {
  return Number.isFinite(section?.time) ? section.time : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function movementBounds(stage) {
  if (!stage) return { xMin: 4, xMax: 96, yMin: 5, yMax: 95 };
  const dimensions = normalizeStageDimensions(stage);
  const shortSide = Math.max(1, Math.min(dimensions.width, dimensions.height));
  const margin = Math.min(Math.max(shortSide * 0.08, 0.6), Math.max(0.9, shortSide * 0.04), shortSide / 3);
  return {
    xMin: Math.min(margin, dimensions.width / 2),
    xMax: Math.max(margin, dimensions.width - margin),
    yMin: Math.min(margin, dimensions.height / 2),
    yMax: Math.max(margin, dimensions.height - margin)
  };
}

export function duplicateSelectionTarget(sections = [], copiedSectionId = "") {
  return sections.some((section) => section.id === copiedSectionId) ? copiedSectionId : "";
}

export function deleteSelectionTarget(sections = [], deletedSectionId = "") {
  const sorted = [...sections].sort((a, b) => byPointTime(a) - byPointTime(b));
  if (sorted.length <= 1) return { nextSectionId: "", disabled: true };
  const index = sorted.findIndex((section) => section.id === deletedSectionId);
  if (index < 0) return { nextSectionId: sorted[0]?.id || "", disabled: false };
  const fallback = sorted[index - 1] || sorted[index + 1] || null;
  return { nextSectionId: fallback?.id || "", disabled: false };
}

export function performerIdsForRole(performers = [], role = "") {
  return performers.filter((performer) => performer.role === role || performer.group === role).map((performer) => performer.id);
}

export function togglePerformerSelection(selection = [], performerId = "", additive = false) {
  if (!performerId) return [];
  if (!additive) return [performerId];
  return selection.includes(performerId)
    ? selection.filter((id) => id !== performerId)
    : [...selection, performerId];
}

export function moveSelectedPerformers(positions = {}, performerIds = [], delta = {}, stage) {
  const bounds = movementBounds(stage);
  return performerIds.reduce((next, id) => {
    const pos = next[id];
    if (!pos) return next;
    return {
      ...next,
      [id]: {
        x: clamp(pos.x + (delta.x || 0), bounds.xMin, bounds.xMax),
        y: clamp(pos.y + (delta.y || 0), bounds.yMin, bounds.yMax)
      }
    };
  }, { ...positions });
}

export function alignSelectedPerformers(positions = {}, performerIds = [], axis = "x") {
  const selected = performerIds.map((id) => positions[id]).filter(Boolean);
  if (selected.length < 2) return { ...positions };
  const key = axis === "y" ? "y" : "x";
  const value = selected.reduce((sum, pos) => sum + pos[key], 0) / selected.length;
  return performerIds.reduce((next, id) => {
    const pos = next[id];
    return pos ? { ...next, [id]: { ...pos, [key]: value } } : next;
  }, { ...positions });
}
