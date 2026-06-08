import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createEditorV2Runtime } from "./editorV2Runtime.mjs";

test("editor v2 runtime exposes Stitch-ready model and command contracts", () => {
  const addSection = () => {};
  const onFormationSelect = () => {};
  const onStagePointerDown = () => {};
  const renderMobilePanelContent = () => null;
  const { actions, model } = createEditorV2Runtime({
    activeSection: { id: "s1", name: "Intro" },
    addSection,
    arrivalLabel: "0:12.0",
    globalActions: [
      { key: "save", label: "저장" },
      { key: "share", label: "공유" },
      { key: "download", label: "내보내기" },
      { key: "more", label: "더보기" }
    ],
    mobileActions: [
      { key: "people", label: "사람" },
      { key: "stage", label: "무대" }
    ],
    onFormationSelect,
    onStagePointerDown,
    performers: [{ id: "p1", name: "Ari" }],
    projectTitle: "Movemap Pro Editor",
    renderMobilePanelContent,
    selectedSectionId: "s1",
    selectionVisualState: "formation-selected",
    sortedSections: [{ id: "s1", name: "Intro" }],
    stageDimensions: { width: 12, height: 8 },
    timelineContentWidth: 720,
    timeLabel: "0:04.0",
    visiblePositions: { p1: { x: 1, y: 2 } }
  });

  assert.equal(model.activeSectionName, "Intro");
  assert.equal(model.projectTitle, "Movemap Pro Editor");
  assert.equal(model.selectionVisualState, "formation-selected");
  assert.equal(model.shell.projectTitle, "Movemap Pro Editor");
  assert.equal(model.stage.stageDimensions.width, 12);
  assert.equal(model.timeline.timelineContentWidth, 720);
  assert.equal(model.selection.selectionVisualState, "formation-selected");
  assert.equal(model.inspector.isMobilePanelOpen, undefined);
  assert.deepEqual(model.actions.globalActions.map((action) => action.key), ["save", "share", "download", "more"]);
  assert.deepEqual(model.globalActions.map((action) => action.key), ["save", "share", "download", "more"]);
  assert.deepEqual(model.mobileActions.map((action) => action.key), ["people", "stage"]);
  assert.equal(actions.addSection, addSection);
  assert.equal(actions.onFormationSelect, onFormationSelect);
  assert.equal(actions.onStagePointerDown, onStagePointerDown);
  assert.equal(actions.renderMobilePanelContent, renderMobilePanelContent);
});

test("main route maps /editor-v2 to forced Stitch editor shell", () => {
  const mainSource = readFileSync(new URL("./main.jsx", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(mainSource, /currentPath === "\/editor-v2"/);
  assert.match(mainSource, /<App forceStitchEditor \/>/);
  assert.match(appSource, /forceStitchEditor = false/);
  assert.match(appSource, /variant=\{forceStitchEditor \? "editor-v2" : "mobile"\}/);
});
