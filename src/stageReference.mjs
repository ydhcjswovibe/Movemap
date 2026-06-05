import { DEFAULT_STAGE_DIMENSIONS } from "./stageGeometry.mjs";

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

function clampStageValue(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeReference(reference, index = 0) {
  const type = reference?.type === "point" ? "point" : "line";
  const id = cleanText(reference?.id, `reference-${index + 1}`);
  const tone = TONES[reference?.tone] ? reference.tone : "neutral";
  const base = {
    id,
    type,
    label: cleanText(reference?.label, id),
    tone,
    locked: reference?.locked !== false,
    visible: reference?.visible !== false
  };

  if (type === "point") {
    return {
      ...base,
      x: clampStageValue(reference?.x, 50),
      y: clampStageValue(reference?.y, 50)
    };
  }

  return {
    ...base,
    x1: clampStageValue(reference?.x1, 0),
    y1: clampStageValue(reference?.y1, 0),
    x2: clampStageValue(reference?.x2, 100),
    y2: clampStageValue(reference?.y2, 100)
  };
}

export function defaultStageReferences(frontZone = { y: DEFAULT_FRONT_ZONE_Y }) {
  return DEFAULT_STAGE_REFERENCES.map((reference) => normalizeReference({
    ...reference,
    ...(reference.id === "front-line" ? { y1: frontZone?.y, y2: frontZone?.y } : {}),
    ...(reference.id === "left-hash" || reference.id === "right-hash" ? { y: frontZone?.y } : {})
  }));
}

export function normalizeStageReferences(references, frontZone = { y: DEFAULT_FRONT_ZONE_Y }) {
  const source = Array.isArray(references) && references.length ? references : defaultStageReferences(frontZone);
  return source.map(normalizeReference);
}

export function visibleStageReferences(references, options = {}) {
  if (options.visible === false) return [];
  return normalizeStageReferences(references, options.frontZone).filter((reference) => reference.visible);
}

export function stageReferenceRenderItems(references, options = {}) {
  const showLabels = options.showLabels !== false;
  return visibleStageReferences(references, options).map((reference) => ({
    ...reference,
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
        `<circle cx="${reference.x}" cy="${reference.y}" r="1.35" fill="${reference.style.fill}" opacity="0.52" />`,
        reference.showLabel ? `<text x="${reference.x}" y="${reference.y - 2.4}" text-anchor="middle" font-size="2.8" fill="${reference.style.fill}" font-family="Arial" font-weight="700">${escapeXml(reference.label)}</text>` : ""
      ].join("");
    }

    const midX = (reference.x1 + reference.x2) / 2;
    const midY = (reference.y1 + reference.y2) / 2;
    return [
      `<line x1="${reference.x1}" y1="${reference.y1}" x2="${reference.x2}" y2="${reference.y2}" stroke="${reference.style.stroke}" stroke-width="0.42" stroke-dasharray="${reference.style.dash}" opacity="0.54" />`,
      reference.showLabel ? `<text x="${midX}" y="${Math.max(5, midY - 1.8)}" text-anchor="middle" font-size="2.6" fill="${reference.style.fill}" font-family="Arial" font-weight="700">${escapeXml(reference.label)}</text>` : ""
    ].join("");
  }).join("");
}
