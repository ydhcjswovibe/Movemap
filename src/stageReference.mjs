import { DEFAULT_STAGE_DIMENSIONS, normalizeStageDimensions } from "./stageGeometry.mjs";
import { stageTokenMetrics } from "./stageVisualMetrics.mjs";

export const DEFAULT_FRONT_ZONE_Y = DEFAULT_STAGE_DIMENSIONS.height * 0.7;

export const DEFAULT_STAGE_REFERENCES = Object.freeze([
  {
    id: "center-line",
    type: "line",
    label: "센터",
    x1: DEFAULT_STAGE_DIMENSIONS.width / 2,
    y1: DEFAULT_STAGE_DIMENSIONS.height * 0.08,
    x2: DEFAULT_STAGE_DIMENSIONS.width / 2,
    y2: DEFAULT_STAGE_DIMENSIONS.height * 0.92,
    tone: "neutral",
    locked: true,
    visible: true
  },
  {
    id: "front-line",
    type: "line",
    label: "앞줄 기준",
    x1: DEFAULT_STAGE_DIMENSIONS.width * 0.08,
    y1: DEFAULT_FRONT_ZONE_Y,
    x2: DEFAULT_STAGE_DIMENSIONS.width * 0.92,
    y2: DEFAULT_FRONT_ZONE_Y,
    tone: "front",
    locked: true,
    visible: true
  },
  {
    id: "left-hash",
    type: "point",
    label: "L",
    x: DEFAULT_STAGE_DIMENSIONS.width * 0.2,
    y: DEFAULT_FRONT_ZONE_Y,
    tone: "side",
    locked: true,
    visible: true
  },
  {
    id: "right-hash",
    type: "point",
    label: "R",
    x: DEFAULT_STAGE_DIMENSIONS.width * 0.8,
    y: DEFAULT_FRONT_ZONE_Y,
    tone: "side",
    locked: true,
    visible: true
  }
]);

const TONES = {
  neutral: { stroke: "#64748b", fill: "#64748b", dash: "2.2 1.8" },
  front: { stroke: "#b91c1c", fill: "#b91c1c", dash: "3 1.5" },
  side: { stroke: "#475569", fill: "#475569", dash: "" }
};

const LEGACY_REFERENCE_STAGE = Object.freeze({ width: 100, height: 100 });

function roundReferenceMetric(value) {
  return Math.round(value * 100) / 100;
}

function referenceMetricsForStage(stage = LEGACY_REFERENCE_STAGE) {
  const tokenMetrics = stageTokenMetrics(stage);
  return {
    pointRadius: roundReferenceMetric(Math.max(0.08, tokenMetrics.tokenRadius * 0.48)),
    labelFontSize: roundReferenceMetric(Math.max(0.24, tokenMetrics.tokenRadius * 0.92)),
    lineStrokeWidth: tokenMetrics.strokeWidth,
    labelOffset: roundReferenceMetric(Math.max(0.24, tokenMetrics.tokenRadius * 0.92)),
    pointLabelOffset: roundReferenceMetric(Math.max(0.34, tokenMetrics.tokenRadius * 1.1))
  };
}

function clampStageValue(value, fallback = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(max, number));
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function defaultReferenceForStage(reference = {}, frontZone = { y: DEFAULT_FRONT_ZONE_Y }, stage = DEFAULT_STAGE_DIMENSIONS) {
  const dimensions = normalizeStageDimensions(stage);
  const frontY = clampStageValue(frontZone?.y, dimensions.height * 0.7, dimensions.height);
  if (reference.id === "center-line") {
    return {
      ...reference,
      x1: dimensions.width / 2,
      y1: 0,
      x2: dimensions.width / 2,
      y2: dimensions.height
    };
  }
  if (reference.id === "front-line") {
    return {
      ...reference,
      x1: 0,
      y1: frontY,
      x2: dimensions.width,
      y2: frontY
    };
  }
  if (reference.id === "left-hash") {
    return {
      ...reference,
      x: dimensions.width * 0.2,
      y: frontY
    };
  }
  if (reference.id === "right-hash") {
    return {
      ...reference,
      x: dimensions.width * 0.8,
      y: frontY
    };
  }
  return reference;
}

function normalizeReference(reference, index = 0, stage = LEGACY_REFERENCE_STAGE, frontZone = { y: DEFAULT_FRONT_ZONE_Y }) {
  const dimensions = normalizeStageDimensions(stage);
  const source = reference?.locked !== false ? defaultReferenceForStage(reference, frontZone, dimensions) : reference;
  const type = reference?.type === "point" ? "point" : "line";
  const id = cleanText(source?.id, `reference-${index + 1}`);
  const tone = TONES[source?.tone] ? source.tone : "neutral";
  const base = {
    id,
    type,
    label: cleanText(source?.label, id),
    tone,
    locked: source?.locked !== false,
    visible: source?.visible !== false
  };

  if (type === "point") {
    return {
      ...base,
      x: clampStageValue(source?.x, dimensions.width / 2, dimensions.width),
      y: clampStageValue(source?.y, dimensions.height / 2, dimensions.height)
    };
  }

  return {
    ...base,
    x1: clampStageValue(source?.x1, 0, dimensions.width),
    y1: clampStageValue(source?.y1, 0, dimensions.height),
    x2: clampStageValue(source?.x2, dimensions.width, dimensions.width),
    y2: clampStageValue(source?.y2, dimensions.height, dimensions.height)
  };
}

export function defaultStageReferences(frontZone = { y: DEFAULT_FRONT_ZONE_Y }, stage = DEFAULT_STAGE_DIMENSIONS) {
  return DEFAULT_STAGE_REFERENCES.map((reference) => normalizeReference(reference, 0, stage, frontZone));
}

export function normalizeStageReferences(references, frontZone = { y: DEFAULT_FRONT_ZONE_Y }, options = {}) {
  const stage = options.stage || LEGACY_REFERENCE_STAGE;
  const source = Array.isArray(references) && references.length ? references : defaultStageReferences(frontZone, stage);
  return source.map((reference, index) => normalizeReference(reference, index, stage, frontZone));
}

export function visibleStageReferences(references, options = {}) {
  if (options.visible === false) return [];
  return normalizeStageReferences(references, options.frontZone, { stage: options.stage }).filter((reference) => reference.visible);
}

export function stageReferenceRenderItems(references, options = {}) {
  const showLabels = options.showLabels !== false;
  const metrics = referenceMetricsForStage(options.stage || LEGACY_REFERENCE_STAGE);
  return visibleStageReferences(references, options).map((reference) => ({
    ...reference,
    metrics,
    showLabel: showLabels,
    style: TONES[reference.tone] || TONES.neutral
  }));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function renderStageReferenceSvg(references, options = {}) {
  return stageReferenceRenderItems(references, options).map((reference) => {
    if (reference.type === "point") {
      return [
        `<circle cx="${reference.x}" cy="${reference.y}" r="${reference.metrics.pointRadius}" fill="${reference.style.fill}" opacity="0.52" />`,
        reference.showLabel ? `<text x="${reference.x}" y="${roundReferenceMetric(reference.y - reference.metrics.pointLabelOffset)}" text-anchor="middle" font-size="${reference.metrics.labelFontSize}" fill="${reference.style.fill}" font-family="Arial" font-weight="700">${escapeXml(reference.label)}</text>` : ""
      ].join("");
    }

    const midX = (reference.x1 + reference.x2) / 2;
    const midY = (reference.y1 + reference.y2) / 2;
    return [
      `<line x1="${reference.x1}" y1="${reference.y1}" x2="${reference.x2}" y2="${reference.y2}" stroke="${reference.style.stroke}" stroke-width="${reference.metrics.lineStrokeWidth}" stroke-dasharray="${reference.style.dash}" opacity="0.54" />`,
      reference.showLabel ? `<text x="${midX}" y="${roundReferenceMetric(Math.max(reference.metrics.labelFontSize, midY - reference.metrics.labelOffset))}" text-anchor="middle" font-size="${reference.metrics.labelFontSize}" fill="${reference.style.fill}" font-family="Arial" font-weight="700">${escapeXml(reference.label)}</text>` : ""
    ].join("");
  }).join("");
}
