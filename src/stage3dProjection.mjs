function clampStage(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

export function projectStagePoint(point = {}) {
  const x = clampStage(point.x);
  const y = clampStage(point.y);
  return {
    x: Number((x - 50).toFixed(2)),
    y: 0,
    z: Number((50 - y).toFixed(2))
  };
}

export function buildStage3dProjection({
  performers = [],
  positions = {},
  transitionPaths = [],
  selectedPerformerId = "",
  selectedPair = []
} = {}) {
  const focused = new Set([selectedPerformerId, ...(selectedPair || [])].filter(Boolean));
  const tokens = performers
    .map((performer) => {
      const position = positions[performer.id];
      if (!position) return null;
      return {
        id: performer.id,
        label: performer.name || performer.label || performer.id,
        color: performer.color || "#475569",
        focused: focused.size ? focused.has(performer.id) : false,
        point: projectStagePoint(position)
      };
    })
    .filter(Boolean);

  const paths = transitionPaths
    .filter((path) => path?.from && path?.to)
    .map((path) => ({
      performerId: path.performerId,
      context: path.context || "current",
      from: projectStagePoint(path.from),
      to: projectStagePoint(path.to)
    }));

  return {
    tokens,
    paths,
    bounds: {
      width: 100,
      depth: 100,
      xMin: -50,
      xMax: 50,
      zMin: -50,
      zMax: 50
    }
  };
}
