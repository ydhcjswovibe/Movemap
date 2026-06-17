import { normalizeStageDimensions } from "./stageGeometry.mjs";

export const FORMATION_TEMPLATES = [
  { id: "line", label: "Line" },
  { id: "two-line", label: "Two-line" },
  { id: "v", label: "V" },
  { id: "inverted-v", label: "Inverted V" },
  { id: "circle", label: "Circle" },
  { id: "diagonal", label: "Diagonal" },
  { id: "block", label: "Block" },
  { id: "pairs", label: "Pairs" }
];

const TEMPLATE_BY_ID = new Map(FORMATION_TEMPLATES.map((template) => [template.id, template]));

function performerIds(performers = []) {
  return performers.map((performer) => performer?.id).filter(Boolean);
}

function integerStage(stageInput) {
  const stage = normalizeStageDimensions(stageInput);
  return {
    width: Math.max(0, Math.floor(stage.width)),
    height: Math.max(0, Math.floor(stage.height))
  };
}

function axisRange(max, margin = 1) {
  const start = Math.min(Math.max(0, margin), max);
  const end = Math.max(start, max - margin);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function stageSlots(stage, margin = 1) {
  const xs = axisRange(stage.width, margin);
  const ys = axisRange(stage.height, margin);
  return ys.flatMap((y) => xs.map((x) => ({ x, y })));
}

function centerOf(stage) {
  return { x: Math.round(stage.width / 2), y: Math.round(stage.height / 2) };
}

function centeredIndexes(length, min = 0, max = length - 1) {
  const clampedMin = Math.max(0, min);
  const clampedMax = Math.min(length - 1, max);
  const center = (clampedMin + clampedMax) / 2;
  return Array.from({ length: clampedMax - clampedMin + 1 }, (_, index) => clampedMin + index)
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
}

function sampledIndexes(length, count, min = 0, max = length - 1) {
  if (count <= 0) return [];
  const values = [];
  const used = new Set();
  const clampedMin = Math.max(0, min);
  const clampedMax = Math.min(length - 1, max);
  const span = Math.max(0, clampedMax - clampedMin);
  for (let index = 0; index < count; index += 1) {
    const value = Math.round(clampedMin + (count === 1 ? span / 2 : (span * index) / (count - 1)));
    if (!used.has(value)) {
      used.add(value);
      values.push(value);
    }
  }
  for (const value of centeredIndexes(length, clampedMin, clampedMax)) {
    if (values.length >= count) break;
    if (!used.has(value)) {
      used.add(value);
      values.push(value);
    }
  }
  return values;
}

function uniqueCandidates(candidates, slots) {
  const slotKeys = new Set(slots.map((slot) => `${slot.x}:${slot.y}`));
  const seen = new Set();
  return candidates.filter((point) => {
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    const key = `${x}:${y}`;
    if (!slotKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    point.x = x;
    point.y = y;
    return true;
  });
}

function nearestUnusedSlot(point, slots, used) {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  return [...slots]
    .filter((slot) => !used.has(`${slot.x}:${slot.y}`))
    .sort((a, b) => {
      const distanceA = Math.hypot(a.x - x, a.y - y);
      const distanceB = Math.hypot(b.x - x, b.y - y);
      return distanceA - distanceB || a.y - b.y || a.x - b.x;
    })[0] || null;
}

function mapDesiredPositions(ids, desired, slots) {
  const used = new Set();
  return ids.reduce((positions, id, index) => {
    const slot = nearestUnusedSlot(desired[index] || desired[desired.length - 1] || centerOf({ width: 0, height: 0 }), slots, used);
    if (!slot) return positions;
    used.add(`${slot.x}:${slot.y}`);
    return { ...positions, [id]: { x: slot.x, y: slot.y } };
  }, {});
}

function buildPositions(ids, stage, desiredBuilder, margin = 1) {
  const safeSlots = stageSlots(stage, margin);
  const edgeSlots = stageSlots(stage, 0);
  const slots = ids.length <= safeSlots.length ? safeSlots : edgeSlots;
  if (ids.length > edgeSlots.length) {
    return { positions: {}, fitsAll: false, disabledReason: "무대/인원 초과" };
  }
  const desired = uniqueCandidates(desiredBuilder(ids.length, stage, slots), slots);
  const fallbackDesired = desired.length >= ids.length ? desired : [...desired, ...slots];
  return {
    positions: mapDesiredPositions(ids, fallbackDesired, slots),
    fitsAll: true,
    disabledReason: ""
  };
}

function lineDesired(count, stage) {
  const y = centerOf(stage).y;
  const rowCount = Math.min(count, Math.max(1, stage.width - 1));
  return sampledIndexes(stage.width + 1, rowCount, 1, Math.max(1, stage.width - 1))
    .map((x) => ({ x, y }));
}

function twoLineDesired(count, stage) {
  const center = centerOf(stage);
  const topY = Math.max(0, center.y - 1);
  const bottomY = Math.min(stage.height, center.y + 1);
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;
  return [
    ...sampledIndexes(stage.width + 1, topCount, 1, Math.max(1, stage.width - 1)).map((x) => ({ x, y: topY })),
    ...sampledIndexes(stage.width + 1, bottomCount, 1, Math.max(1, stage.width - 1)).map((x) => ({ x, y: bottomY }))
  ];
}

function vDesired(count, stage, inverted = false) {
  if (count <= 1) return [centerOf(stage)];
  const center = (count - 1) / 2;
  const maxDepth = Math.max(1, Math.floor(stage.height / 2));
  const apexY = inverted ? Math.min(stage.height - 1, Math.ceil(stage.height * 0.7)) : Math.max(1, Math.floor(stage.height * 0.3));
  return sampledIndexes(stage.width + 1, count, 1, Math.max(1, stage.width - 1)).map((x, index) => {
    const distance = center === 0 ? 0 : Math.abs(index - center) / center;
    return {
      x,
      y: apexY + Math.round((inverted ? -1 : 1) * distance * maxDepth)
    };
  });
}

function circleDesired(count, stage) {
  const center = centerOf(stage);
  if (count <= 1) return [center];
  const radiusX = Math.max(1, Math.floor((stage.width - 2) / 2));
  const radiusY = Math.max(1, Math.floor((stage.height - 2) / 2));
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return {
      x: center.x + Math.round(Math.cos(angle) * radiusX),
      y: center.y + Math.round(Math.sin(angle) * radiusY)
    };
  });
}

function diagonalDesired(count, stage) {
  return sampledIndexes(stage.width + 1, count, 1, Math.max(1, stage.width - 1)).map((x, index, xs) => ({
    x,
    y: Math.round(1 + ((Math.max(1, stage.height - 2) * index) / Math.max(1, xs.length - 1)))
  }));
}

function blockDesired(count, stage) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const xs = sampledIndexes(stage.width + 1, columns, 1, Math.max(1, stage.width - 1));
  const ys = sampledIndexes(stage.height + 1, rows, 1, Math.max(1, stage.height - 1));
  return Array.from({ length: count }, (_, index) => ({
    x: xs[index % xs.length],
    y: ys[Math.floor(index / xs.length)] ?? ys[ys.length - 1]
  }));
}

function pairsDesired(count, stage) {
  const center = centerOf(stage);
  const pairCount = Math.ceil(count / 2);
  const rows = Math.max(1, Math.ceil(pairCount / Math.max(1, Math.floor(stage.width / 4))));
  const columns = Math.max(1, Math.ceil(pairCount / rows));
  const xs = sampledIndexes(stage.width + 1, columns, 2, Math.max(2, stage.width - 2));
  const ys = sampledIndexes(stage.height + 1, rows, 1, Math.max(1, stage.height - 1));
  return Array.from({ length: count }, (_, index) => {
    const pairIndex = Math.floor(index / 2);
    const side = index % 2 === 0 ? -1 : 1;
    return {
      x: (xs[pairIndex % xs.length] ?? center.x) + side,
      y: ys[Math.floor(pairIndex / xs.length)] ?? center.y
    };
  });
}

const POSITION_BUILDERS = {
  line: lineDesired,
  "two-line": twoLineDesired,
  v: (count, stage) => vDesired(count, stage, false),
  "inverted-v": (count, stage) => vDesired(count, stage, true),
  circle: circleDesired,
  diagonal: diagonalDesired,
  block: blockDesired,
  pairs: pairsDesired
};

export function buildFormationTemplatePreview(templateId, performers = [], stageInput = {}) {
  const template = TEMPLATE_BY_ID.get(templateId) || FORMATION_TEMPLATES[0];
  const ids = performerIds(performers);
  const stage = normalizeStageDimensions(stageInput);
  const integerGridStage = integerStage(stage);
  const { positions, fitsAll, disabledReason } = buildPositions(ids, integerGridStage, POSITION_BUILDERS[template.id]);

  return {
    templateId: template.id,
    label: template.label,
    stage,
    positions,
    performerCount: ids.length,
    gridUnit: 1,
    fitsAll,
    disabledReason,
    provenance: {
      kind: "template",
      templateId: template.id,
      stage,
      performerCount: ids.length,
      gridUnit: 1,
      fitsAll
    }
  };
}

export function applyTemplatePositionsToSection(section = {}, preview = {}) {
  return {
    ...section,
    positions: {
      ...(section.positions || {}),
      ...(preview.positions || {})
    },
    formationProvenance: { ...(preview.provenance || {}) }
  };
}
