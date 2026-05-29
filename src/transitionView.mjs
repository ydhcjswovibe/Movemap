const MIN_MOVEMENT_DISTANCE = 1;
const LONG_MOVEMENT_DISTANCE = 42;

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
  reduceClutter = false
} = {}) {
  const visiblePerformers = reduceClutter && selectedPerformerId
    ? performers.filter((performer) => performer.id === selectedPerformerId)
    : performers;
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

export function transitionPathStyle({ performer, selectedPerformerId = "" } = {}) {
  const selected = selectedPerformerId && performer?.id === selectedPerformerId;
  const dimmed = selectedPerformerId && !selected;
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
