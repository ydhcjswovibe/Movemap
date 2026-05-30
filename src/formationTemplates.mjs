import { normalizeStageDimensions } from "./stageGeometry.mjs";

export const FORMATION_TEMPLATES = [
  { id: "line", label: "Line" },
  { id: "two-line", label: "Two-line" },
  { id: "v", label: "V" },
  { id: "circle", label: "Circle" },
  { id: "diagonal", label: "Diagonal" },
  { id: "block", label: "Block" }
];

const TEMPLATE_BY_ID = new Map(FORMATION_TEMPLATES.map((template) => [template.id, template]));

function clampStage(value, max = 100) {
  return Math.max(0, Math.min(max, Number(value) || 0));
}

function roundStage(value, max = 100) {
  return Number(clampStage(value, max).toFixed(2));
}

function performerIds(performers = []) {
  return performers.map((performer) => performer?.id).filter(Boolean);
}

function spreadValue(index, count, min, max) {
  if (count <= 1) return (min + max) / 2;
  return min + ((max - min) * index) / (count - 1);
}

function point(x, y, stage) {
  return { x: roundStage(x, stage.width), y: roundStage(y, stage.height) };
}

function mapPositions(ids, positionForIndex) {
  return ids.reduce((positions, id, index) => ({
    ...positions,
    [id]: positionForIndex(index, ids.length)
  }), {});
}

function linePositions(ids, stage) {
  return mapPositions(ids, (index, count) => point(spreadValue(index, count, stage.width * 0.18, stage.width * 0.82), stage.height * 0.5, stage));
}

function twoLinePositions(ids, stage) {
  return mapPositions(ids, (index, count) => {
    const topCount = Math.ceil(count / 2);
    const isTop = index < topCount;
    const rowIndex = isTop ? index : index - topCount;
    const rowCount = isTop ? topCount : count - topCount;
    return point(spreadValue(rowIndex, rowCount, stage.width * 0.22, stage.width * 0.78), isTop ? stage.height * 0.4 : stage.height * 0.6, stage);
  });
}

function vPositions(ids, stage) {
  return mapPositions(ids, (index, count) => {
    if (count <= 1) return point(stage.width * 0.5, stage.height * 0.45, stage);
    const center = (count - 1) / 2;
    const distance = Math.abs(index - center) / center;
    return point(spreadValue(index, count, stage.width * 0.24, stage.width * 0.76), stage.height * (0.4 + distance * 0.36), stage);
  });
}

function circlePositions(ids, stage) {
  return mapPositions(ids, (index, count) => {
    if (count <= 1) return point(stage.width * 0.5, stage.height * 0.5, stage);
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const radiusX = stage.width * 0.32;
    const radiusY = stage.height * 0.32;
    return point(stage.width * 0.5 + Math.cos(angle) * radiusX, stage.height * 0.5 + Math.sin(angle) * radiusY, stage);
  });
}

function diagonalPositions(ids, stage) {
  return mapPositions(ids, (index, count) => point(
    spreadValue(index, count, stage.width * 0.24, stage.width * 0.76),
    spreadValue(index, count, stage.height * 0.28, stage.height * 0.72),
    stage
  ));
}

function blockPositions(ids, stage) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
  const rows = Math.max(1, Math.ceil(ids.length / columns));
  return mapPositions(ids, (index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return point(spreadValue(column, columns, stage.width * 0.32, stage.width * 0.68), spreadValue(row, rows, stage.height * 0.36, stage.height * 0.64), stage);
  });
}

const POSITION_BUILDERS = {
  line: linePositions,
  "two-line": twoLinePositions,
  v: vPositions,
  circle: circlePositions,
  diagonal: diagonalPositions,
  block: blockPositions
};

export function buildFormationTemplatePreview(templateId, performers = [], stageInput = {}) {
  const template = TEMPLATE_BY_ID.get(templateId) || FORMATION_TEMPLATES[0];
  const ids = performerIds(performers);
  const stage = normalizeStageDimensions(stageInput);
  const positions = POSITION_BUILDERS[template.id](ids, stage);

  return {
    templateId: template.id,
    label: template.label,
    positions,
    provenance: {
      kind: "template",
      templateId: template.id,
      stage,
      performerCount: ids.length
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
