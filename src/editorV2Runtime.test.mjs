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

test("editor v2 runtime exposes inspector panel descriptors and command callbacks", () => {
  const calls = [];
  const { actions, model } = createEditorV2Runtime({
    activeMobilePanelActionKey: "view",
    handleMobileAction: (key) => calls.push(`mobile:${key}`),
    inspectorCommands: {
      "toggle-stage-references": () => calls.push("command:refs")
    },
    isMobilePanelOpen: true,
    mobilePanelKind: "view",
    mobilePanelSize: "half",
    mobilePanelTitle: "보기",
    readonly: false,
    selectedSection: { id: "s1", name: "Intro", time: 12, moveDuration: 4 },
    selectedSectionId: "s1",
    stageReferences: [{ id: "front" }],
    stageViewMode: "2d",
    transitionPathCount: 3
  });

  assert.equal(model.inspector.isOpen, true);
  assert.equal(model.inspector.panelKey, "view");
  assert.equal(model.inspector.title, "보기");
  assert.equal(model.inspector.mobilePanelSize, "half");
  assert.equal(model.inspector.currentPanel.key, "view");
  assert.deepEqual(
    model.inspector.currentPanel.sections[0].items.map((item) => [item.label, item.value]),
    [
      ["보기 모드", "2D"],
      ["참조선", "1개"],
      ["동선", "3개"]
    ]
  );
  const referenceAction = model.inspector.currentPanel.actions.find((action) => action.key === "toggle-stage-references");
  actions.handleInspectorAction(referenceAction);
  assert.deepEqual(calls, ["command:refs"]);
});

test("editor v2 inspector model keeps temporary fallback panels and mobile action descriptors", () => {
  const calls = [];
  const renderMobilePanelContent = () => null;
  const { actions, model } = createEditorV2Runtime({
    handleMobileAction: (key) => calls.push(key),
    isMobilePanelOpen: true,
    mobilePanelKind: "formation",
    mobilePanelTitle: "대형",
    renderMobilePanelContent,
    selectedSection: { id: "s1", name: "Intro", time: 12, moveDuration: 4 },
    selectedSectionId: "s1"
  });

  assert.equal(model.inspector.currentPanel.fallback, undefined);
  assert.deepEqual(
    model.inspector.currentPanel.sections[0].items.map((item) => [item.label, item.value]),
    [
      ["대형명", "Intro"],
      ["도착 시각", "0:12.0"],
      ["이동 시간", "4초"]
    ]
  );
  actions.handleInspectorAction(model.inspector.currentPanel.actions[0]);
  assert.deepEqual(calls, ["duplicate-formation"]);
  assert.equal(model.inspector.panels.people.fallback, true);
  assert.equal(model.inspector.panels.stage.fallback, true);
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
