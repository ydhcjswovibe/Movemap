import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_FRONT_ZONE_Y,
  defaultStageReferences,
  normalizeStageReferences,
  renderStageReferenceSvg,
  stageReferenceRenderItems,
  visibleStageReferences
} from "./stageReference.mjs";

test("creates default fixed stage reference marks from the front zone", () => {
  const defaultReferences = defaultStageReferences();
  const references = defaultStageReferences({ y: 64 });

  assert.equal(DEFAULT_FRONT_ZONE_Y, 5.6);
  assert.equal(defaultReferences.find((reference) => reference.id === "center-line").x1, 6);
  assert.equal(defaultReferences.find((reference) => reference.id === "front-line").y1, 5.6);
  assert.equal(references.length, 4);
  assert.equal(references.find((reference) => reference.id === "front-line").y1, 64);
  assert.equal(references.find((reference) => reference.id === "left-hash").y, 64);
  assert.ok(references.every((reference) => reference.locked));
});

test("normalizes custom stage references without allowing out-of-stage coordinates", () => {
  const references = normalizeStageReferences([
    { id: "bad-line", type: "line", label: "  Custom  ", x1: -20, y1: 10, x2: 140, y2: 120, visible: true },
    { id: "bad-point", type: "point", x: "nope", y: 88, locked: false }
  ]);

  assert.deepEqual(references[0], {
    id: "bad-line",
    type: "line",
    label: "Custom",
    tone: "neutral",
    locked: true,
    visible: true,
    x1: 0,
    y1: 10,
    x2: 100,
    y2: 100
  });
  assert.equal(references[1].x, 50);
  assert.equal(references[1].y, 88);
  assert.equal(references[1].locked, false);
});

test("normalizes custom stage references against supplied stage bounds", () => {
  const references = normalizeStageReferences([
    { id: "bad-line", type: "line", x1: -20, y1: 10, x2: 140, y2: 120 },
    { id: "bad-point", type: "point", x: "nope", y: 88, locked: false }
  ], { y: 5.6 }, { stage: { width: 12, height: 8 } });

  assert.equal(references[0].x1, 0);
  assert.equal(references[0].y1, 8);
  assert.equal(references[0].x2, 12);
  assert.equal(references[0].y2, 8);
  assert.equal(references[1].x, 6);
  assert.equal(references[1].y, 8);
});

test("filters the stage reference layer without deleting model data", () => {
  const references = normalizeStageReferences([
    { id: "visible", type: "point", x: 20, y: 30 },
    { id: "hidden", type: "point", x: 40, y: 50, visible: false }
  ]);

  assert.deepEqual(visibleStageReferences(references).map((reference) => reference.id), ["visible"]);
  assert.deepEqual(visibleStageReferences(references, { visible: false }), []);
});

test("creates render items with labels disabled independently from visibility", () => {
  const items = stageReferenceRenderItems([{ id: "center", type: "line", x1: 50, y1: 0, x2: 50, y2: 100 }], {
    showLabels: false
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].showLabel, false);
  assert.equal(items[0].style.stroke, "#64748b");
});

test("renders stage reference svg safely for exported readable views", () => {
  const svg = renderStageReferenceSvg([{ id: "front", type: "line", label: "Front <A>", x1: 0, y1: 70, x2: 100, y2: 70 }]);

  assert.match(svg, /<line/);
  assert.match(svg, /Front &lt;A&gt;/);
});

test("renders compact reference marks from stage token metrics", () => {
  const svg = renderStageReferenceSvg([
    { id: "front", type: "line", label: "Front", x1: 0, y1: 5.6, x2: 12, y2: 5.6 },
    { id: "mark", type: "point", label: "M", x: 6, y: 5.6 }
  ], { stage: { width: 12, height: 8 } });

  assert.match(svg, /stroke-width="0.05"/);
  assert.match(svg, /r="0.15"/);
  assert.match(svg, /font-size="0.29"/);
});
