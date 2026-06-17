import assert from "node:assert/strict";
import test from "node:test";

import {
  FORMATION_TEMPLATES,
  applyTemplatePositionsToSection,
  buildFormationTemplatePreview
} from "./formationTemplates.mjs";
import { DEFAULT_STAGE_DIMENSIONS } from "./stageGeometry.mjs";

const performers = [
  { id: "lead" },
  { id: "follow" },
  { id: "center" },
  { id: "back" },
  { id: "wing" }
];

function roster(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}` }));
}

function assertBoundedPositions(positions, stage = DEFAULT_STAGE_DIMENSIONS) {
  for (const position of Object.values(positions)) {
    assert.ok(position.x >= 0 && position.x <= stage.width, `x ${position.x} is bounded`);
    assert.ok(position.y >= 0 && position.y <= stage.height, `y ${position.y} is bounded`);
    assert.equal(position.x, Math.round(position.x), `x ${position.x} is on a 1m grid`);
    assert.equal(position.y, Math.round(position.y), `y ${position.y} is on a 1m grid`);
  }
}

function assertNoDuplicateGridPositions(positions) {
  const keys = Object.values(positions).map((position) => `${position.x}:${position.y}`);
  assert.equal(new Set(keys).size, keys.length);
}

test("exports the supported deterministic template ids", () => {
  assert.deepEqual(
    FORMATION_TEMPLATES.map((template) => template.id),
    ["line", "two-line", "v", "inverted-v", "circle", "diagonal", "block", "pairs"]
  );
});

test("template previews are deterministic and include stable provenance", () => {
  const first = buildFormationTemplatePreview("v", performers);
  const second = buildFormationTemplatePreview("v", performers);

  assert.deepEqual(first, second);
  assert.equal(first.templateId, "v");
  assert.equal(first.label, "V");
  assert.deepEqual(first.stage, DEFAULT_STAGE_DIMENSIONS);
  assert.equal(first.performerCount, performers.length);
  assert.equal(first.gridUnit, 1);
  assert.equal(first.fitsAll, true);
  assert.deepEqual(Object.keys(first.positions), performers.map((performer) => performer.id));
  assert.deepEqual(first.provenance, {
    kind: "template",
    templateId: "v",
    stage: DEFAULT_STAGE_DIMENSIONS,
    performerCount: performers.length,
    gridUnit: 1,
    fitsAll: true
  });
});

test("templates adapt to roster counts with snapped unique stage positions", () => {
  for (const template of FORMATION_TEMPLATES) {
    for (const count of [1, 2, 5, 12, 24]) {
      const currentRoster = roster(count);
      const preview = buildFormationTemplatePreview(template.id, currentRoster);

      assert.equal(preview.fitsAll, true);
      assert.deepEqual(Object.keys(preview.positions), currentRoster.map((performer) => performer.id));
      assertBoundedPositions(preview.positions);
      assertNoDuplicateGridPositions(preview.positions);
    }
  }
});

test("templates scale into custom stage dimensions", () => {
  for (const stage of [{ width: 20, height: 10 }, { width: 8, height: 6 }]) {
    for (const template of FORMATION_TEMPLATES) {
      const preview = buildFormationTemplatePreview(template.id, roster(12), stage);

      assert.equal(preview.fitsAll, true);
      assertBoundedPositions(preview.positions, stage);
      assertNoDuplicateGridPositions(preview.positions);
      assert.deepEqual(preview.provenance.stage, stage);
    }
  }
});

test("template previews report impossible overflow when the grid cannot fit the roster", () => {
  const preview = buildFormationTemplatePreview("block", roster(10), { width: 2, height: 2 });

  assert.equal(preview.fitsAll, false);
  assert.equal(preview.disabledReason, "무대/인원 초과");
  assert.deepEqual(preview.positions, {});
  assert.equal(preview.provenance.fitsAll, false);
});

test("template application patches a section without mutating inputs", () => {
  const section = {
    id: "f1",
    name: "F1",
    positions: {
      lead: { x: 1, y: 2 },
      spare: { x: 99, y: 98 }
    }
  };
  const preview = buildFormationTemplatePreview("line", performers.slice(0, 2));

  const patched = applyTemplatePositionsToSection(section, preview);

  assert.notEqual(patched, section);
  assert.deepEqual(section.positions.lead, { x: 1, y: 2 });
  assert.deepEqual(patched.positions.spare, { x: 99, y: 98 });
  assert.deepEqual(patched.positions.lead, preview.positions.lead);
  assert.deepEqual(patched.formationProvenance, preview.provenance);
});
