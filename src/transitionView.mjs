const MIN_MOVEMENT_DISTANCE = 1;
const LONG_MOVEMENT_DISTANCE = 42;
const OVERLAP_WARNING_DISTANCE = 5;

function movedEnough(from, to) {
  if (!from || !to) return false;
  return Math.abs(from.x - to.x) >= MIN_MOVEMENT_DISTANCE || Math.abs(from.y - to.y) >= MIN_MOVEMENT_DISTANCE;
}

function pathFor({ context, performer, from, to }) {
  const distance = movementDistance(from, to);
  return {
    context,
    performerId: performer.id,
    color: performer.color,
    from,
    to,
    distance,
    warning: distance >= LONG_MOVEMENT_DISTANCE
  };
}

export function movementDistance(from, to) {
  if (!from || !to) return 0;
  return Math.hypot((to.x || 0) - (from.x || 0), (to.y || 0) - (from.y || 0));
}

export function buildTransitionPaths({
  performers = [],
  previousSection = null,
  currentSection = null,
  nextSection = null,
  selectedPerformerId = "",
  selectedPair = [],
  role = "",
  filter = "",
  reduceClutter = false
} = {}) {
  const visiblePerformers = filterTransitionPerformers({
    performers,
    selectedPerformerId,
    selectedPair,
    role,
    filter: filter || (reduceClutter && selectedPerformerId ? "selected-performer" : "all")
  });
  const paths = [];

  for (const performer of visiblePerformers) {
    const previous = previousSection?.positions?.[performer.id];
    const current = currentSection?.positions?.[performer.id];
    if (movedEnough(previous, current)) {
      paths.push(pathFor({ context: "previous", performer, from: previous, to: current }));
    }
  }

  for (const performer of visiblePerformers) {
    const current = currentSection?.positions?.[performer.id];
    const next = nextSection?.positions?.[performer.id];
    if (movedEnough(current, next)) {
      paths.push(pathFor({ context: "next", performer, from: current, to: next }));
    }
  }

  return paths;
}

export function filterTransitionPerformers({
  performers = [],
  selectedPerformerId = "",
  selectedPair = [],
  role = "",
  filter = "all"
} = {}) {
  if (filter === "selected-performer" && selectedPerformerId) {
    return performers.filter((performer) => performer.id === selectedPerformerId);
  }
  if (filter === "selected-pair" && selectedPair.length) {
    const pairIds = new Set(selectedPair);
    return performers.filter((performer) => pairIds.has(performer.id));
  }
  if (filter === "role" && role) {
    return performers.filter((performer) => performer.role === role || performer.group === role);
  }
  return performers;
}

export function transitionPathStyle({ performer, selectedPerformerId = "", focusedPerformerIds = [] } = {}) {
  const focusedIds = new Set(focusedPerformerIds.filter(Boolean));
  const hasFocus = Boolean(selectedPerformerId || focusedIds.size);
  const selected = (selectedPerformerId && performer?.id === selectedPerformerId) || focusedIds.has(performer?.id);
  const dimmed = hasFocus && !selected;
  return {
    stroke: performer?.color || "#334155",
    strokeWidth: selected ? 1.35 : 0.8,
    opacity: selected ? 0.92 : dimmed ? 0.1 : 0.65
  };
}

export function longDistanceWarnings(paths = [], performers = []) {
  const names = new Map(performers.map((performer) => [performer.id, performer.name || performer.label || performer.id]));
  return paths
    .filter((path) => path.warning)
    .map((path) => ({
      performerId: path.performerId,
      name: names.get(path.performerId) || path.performerId,
      context: path.context,
      distance: Math.round(path.distance)
    }));
}

export function overlapWarnings(currentSection = null, performers = [], threshold = OVERLAP_WARNING_DISTANCE) {
  const names = new Map(performers.map((performer) => [performer.id, performer.name || performer.label || performer.id]));
  const positions = currentSection?.positions || {};
  const ids = performers.map((performer) => performer.id).filter((id) => positions[id]);
  const warnings = [];

  for (let leftIndex = 0; leftIndex < ids.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex += 1) {
      const leftId = ids[leftIndex];
      const rightId = ids[rightIndex];
      const distance = movementDistance(positions[leftId], positions[rightId]);
      if (distance < threshold) {
        warnings.push({
          performerIds: [leftId, rightId],
          names: [names.get(leftId) || leftId, names.get(rightId) || rightId],
          distance: Math.round(distance * 10) / 10
        });
      }
    }
  }

  return warnings;
}
