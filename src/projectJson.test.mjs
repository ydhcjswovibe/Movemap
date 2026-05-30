import assert from "node:assert/strict";
import test from "node:test";

import { createProjectJsonDownload, validateProjectImport, withProjectSnapshotMetadata } from "./projectJson.mjs";

test("creates a plain json save file from the current project", async () => {
  const plan = {
    title: "Stage Map Demo",
    sections: [{ id: "intro", name: "Intro" }]
  };

  const download = createProjectJsonDownload(plan);

  assert.equal(download.filename, "Stage Map Demo.json");
  assert.equal(download.blob.type, "application/json");
  assert.deepEqual(JSON.parse(await download.blob.text()), plan);
});

test("uses a fallback filename when the project has no title", () => {
  const download = createProjectJsonDownload({ title: "   " });

  assert.equal(download.filename, "movemap-project.json");
});

test("validates portable project imports with structured errors", () => {
  const valid = validateProjectImport({
    title: "Demo",
    performers: [{ id: "a1", label: "A1" }],
    sections: [{ id: "s1", time: 4, positions: { a1: { x: 30, y: 70 } } }],
    stage: { width: 100, height: 100 },
    extraMetadata: { preserved: true }
  });

  assert.equal(valid.ok, true);
  assert.deepEqual(valid.errors, []);

  const invalid = validateProjectImport({
    title: "Demo",
    performers: [{ label: "A1" }],
    sections: [{ id: "s1", time: -1, positions: { a1: { x: 130, y: 70 } } }],
    stageReferences: {}
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.errors.map((error) => error.code), [
    "invalid-performer",
    "invalid-timing",
    "invalid-position",
    "invalid-stage-references"
  ]);
});

test("validates imported positions against custom stage dimensions", () => {
  const project = {
    title: "Wide stage",
    performers: [{ id: "a1" }],
    stage: { width: 140, height: 80 },
    sections: [{ id: "f1", positions: { a1: { x: 120, y: 70 } }, time: 0 }]
  };

  assert.equal(validateProjectImport(project).ok, true);
  assert.equal(validateProjectImport({
    ...project,
    sections: [{ id: "f1", positions: { a1: { x: 141, y: 70 } }, time: 0 }]
  }).ok, false);
});

test("adds snapshot metadata without mutating the exported project", () => {
  const plan = {
    title: "Snapshot Demo",
    performers: [{ id: "a1" }],
    sections: [{ id: "s1" }]
  };

  const snapshot = withProjectSnapshotMetadata(plan, {
    id: "snap-1",
    exportedAt: "2026-05-29T00:00:00.000Z"
  });

  assert.equal(plan.snapshots, undefined);
  assert.deepEqual(snapshot.snapshots, [{
    id: "snap-1",
    kind: "manual-export",
    exportedAt: "2026-05-29T00:00:00.000Z",
    sectionCount: 1,
    performerCount: 1
  }]);
});
