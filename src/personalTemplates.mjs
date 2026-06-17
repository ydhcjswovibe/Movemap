import { DEFAULT_STAGE_DIMENSIONS } from "./stageGeometry.mjs";

export const PERSONAL_TEMPLATES_STORAGE_KEY = "movemap-personal-templates";

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanPositions(positions = {}) {
  return Object.fromEntries(Object.entries(positions)
    .filter(([, point]) => isPlainObject(point) && Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(([id, point]) => [id, { x: Number(point.x), y: Number(point.y) }]));
}

export function normalizePersonalTemplate(template = {}) {
  const positions = cleanPositions(template.positions);
  if (!Object.keys(positions).length) return null;
  const createdAt = cleanText(template.createdAt, new Date().toISOString());
  const id = cleanText(template.id, `personal-${createdAt}`);
  return {
    id,
    label: cleanText(template.label, "개인 템플릿"),
    source: "personal",
    createdAt,
    stage: {
      width: Number.isFinite(template.stage?.width) ? Number(template.stage.width) : DEFAULT_STAGE_DIMENSIONS.width,
      height: Number.isFinite(template.stage?.height) ? Number(template.stage.height) : DEFAULT_STAGE_DIMENSIONS.height
    },
    performerIds: Array.isArray(template.performerIds) ? template.performerIds.filter(Boolean) : Object.keys(positions),
    positions
  };
}

export function loadPersonalTemplates(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const raw = JSON.parse(storage.getItem(PERSONAL_TEMPLATES_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(normalizePersonalTemplate).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function savePersonalTemplates(templates = [], storage = globalThis.localStorage) {
  if (!storage) return [];
  const normalized = templates.map(normalizePersonalTemplate).filter(Boolean).slice(0, 12);
  storage.setItem(PERSONAL_TEMPLATES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createPersonalTemplateFromSection(section = {}, plan = {}, options = {}) {
  const createdAt = options.createdAt || new Date().toISOString();
  return normalizePersonalTemplate({
    id: options.id || `personal-${createdAt}`,
    label: options.label || `${section.name || "대형"} 개인 템플릿`,
    createdAt,
    stage: plan.stage || DEFAULT_STAGE_DIMENSIONS,
    performerIds: (plan.performers || []).map((performer) => performer.id).filter(Boolean),
    positions: section.positions || {}
  });
}

export function personalTemplateToPreview(template = {}) {
  const normalized = normalizePersonalTemplate(template);
  if (!normalized) return null;
  return {
    templateId: normalized.id,
    label: normalized.label,
    stage: normalized.stage,
    positions: normalized.positions,
    performerCount: normalized.performerIds.length,
    gridUnit: 1,
    fitsAll: true,
    disabledReason: "",
    provenance: {
      kind: "personal-template",
      templateId: normalized.id,
      source: normalized.source,
      createdAt: normalized.createdAt,
      stage: normalized.stage,
      performerCount: normalized.performerIds.length,
      gridUnit: 1,
      fitsAll: true
    }
  };
}
