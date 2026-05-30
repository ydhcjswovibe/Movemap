import assert from "node:assert/strict";
import test from "node:test";

import {
  PERSONAL_TEMPLATES_STORAGE_KEY,
  createPersonalTemplateFromSection,
  loadPersonalTemplates,
  personalTemplateToPreview,
  savePersonalTemplates
} from "./personalTemplates.mjs";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) || null,
    setItem: (key, value) => map.set(key, value)
  };
}

test("saves and loads personal templates with stage metadata", () => {
  const storage = memoryStorage();
  const section = { id: "f1", name: "F1", positions: { a1: { x: 10, y: 20 } } };
  const plan = { stage: { width: 120, height: 80 }, performers: [{ id: "a1" }] };
  const template = createPersonalTemplateFromSection(section, plan, { id: "personal-f1", createdAt: "2026-05-29T00:00:00.000Z" });

  const saved = savePersonalTemplates([template], storage);
  const loaded = loadPersonalTemplates(storage);

  assert.equal(JSON.parse(storage.getItem(PERSONAL_TEMPLATES_STORAGE_KEY)).length, 1);
  assert.deepEqual(loaded, saved);
  assert.deepEqual(loaded[0].stage, { width: 120, height: 80 });
});

test("personal templates convert to formation previews", () => {
  const preview = personalTemplateToPreview({
    id: "personal-f1",
    label: "F1 개인 템플릿",
    createdAt: "2026-05-29T00:00:00.000Z",
    positions: { a1: { x: 10, y: 20 } },
    stage: { width: 120, height: 80 },
    performerIds: ["a1"]
  });

  assert.equal(preview.templateId, "personal-f1");
  assert.equal(preview.provenance.kind, "personal-template");
  assert.deepEqual(preview.provenance.stage, { width: 120, height: 80 });
});
