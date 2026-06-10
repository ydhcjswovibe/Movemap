import assert from "node:assert/strict";
import test from "node:test";

import { clientPointToV2Stage, createV2EditorRuntime } from "./v2EditorRuntime.mjs";

test("V2 editor runtime exposes the stable shell, stage, selection, timeline, capability, and action contract", () => {
  const selectPerformer = () => {};
  const onFormationSelect = () => {};
  const onV2StageTap = () => {};
  const runtime = createV2EditorRuntime({
    addSection: () => {},
    currentSectionId: "s2",
    localSaveLabel: "Saved just now",
    onFormationSelect,
    onV2StageTap,
    performers: [{ id: "p1", label: "P1" }],
    projectTitle: "V2 Runtime Fixture",
    readonly: false,
    redoDisabled: true,
    selectPerformer,
    selectedPerformerId: "p1",
    selectedPerformerIds: ["p1"],
    selectedSection: { id: "s1", name: "Intro" },
    selectedSectionId: "s1",
    sortedSections: [{ id: "s1", name: "Intro" }, { id: "s2", name: "Finale" }],
    stageDimensions: { width: 12, height: 8 },
    timelineContentWidth: 1280,
    timelineScrollX: 140,
    timelineTicks: [{ label: "0s", pixel: 0 }],
    timelineVisualSegments: [{ kind: "hold", sectionId: "s1", leftPx: 0, widthPx: 240 }],
    undoDisabled: false,
    visiblePositions: { p1: { x: 3, y: 4 } },
    waveformBars: [0.1, 0.4]
  });

  assert.equal(runtime.shell.projectTitle, "V2 Runtime Fixture");
  assert.equal(runtime.shell.saveLabel, "Saved just now");
  assert.equal(runtime.stage.stageDimensions.width, 12);
  assert.equal(runtime.selection.selectedSectionId, "s1");
  assert.equal(runtime.selection.currentSectionId, "s2");
  assert.equal(runtime.timeline.contentWidth, 1280);
  assert.equal(runtime.timeline.scrollX, 140);
  assert.equal(runtime.timeline.holdMoveSegments[0].widthPx, 240);
  assert.deepEqual(runtime.timeline.waveformBars, [0.1, 0.4]);
  assert.equal(runtime.capabilities.canAddFormation, true);
  assert.equal(runtime.capabilities.canDuplicate, true);
  assert.equal(runtime.capabilities.canDelete, true);
  assert.equal(runtime.capabilities.canUndo, true);
  assert.equal(runtime.capabilities.canRedo, false);
  assert.deepEqual(runtime.topActions.map((action) => action.key), ["share", "export", "more"]);
  assert.deepEqual(runtime.transportActions.map((action) => action.key), ["play", "undo", "redo"]);
  assert.deepEqual(runtime.bottomRail.map((action) => action.key), ["duplicate-performer", "delete-performer", "performer-role", "clear-selection"]);
  assert.deepEqual(runtime.exportMenu.map((item) => item.key), ["export-json", "export-png", "export-all-png", "print"]);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-json").label, "프로젝트 JSON 내보내기");
  assert.equal(runtime.moreMenu[0].key, "settings");
  assert.equal(runtime.moreMenu.some((item) => item.key.startsWith("export-") || item.key === "print"), false);
  assert.equal(runtime.settingsMenu[0].key, "toggle-snap");
  assert.equal(runtime.actions.selectPerformer, selectPerformer);
  assert.equal(runtime.actions.selectFormation, onFormationSelect);
  assert.equal(runtime.actions.stageTap, onV2StageTap);
});

test("V2 capabilities reflect readonly and empty selection states", () => {
  const readonlyRuntime = createV2EditorRuntime({
    readonly: true,
    selectedSection: { id: "s1" },
    sortedSections: [{ id: "s1" }, { id: "s2" }],
    undoDisabled: false,
    redoDisabled: false
  });
  assert.equal(readonlyRuntime.capabilities.canAddFormation, false);
  assert.equal(readonlyRuntime.capabilities.canAddAudio, false);
  assert.equal(readonlyRuntime.capabilities.canDuplicate, false);
  assert.equal(readonlyRuntime.capabilities.canDelete, false);
  assert.equal(readonlyRuntime.capabilities.canUndo, false);
  assert.equal(readonlyRuntime.capabilities.canRedo, false);

  const emptyRuntime = createV2EditorRuntime({
    activeTab: "Cast",
    readonly: false,
    sortedSections: [{ id: "s1" }],
    undoDisabled: true,
    redoDisabled: true
  });
  assert.equal(emptyRuntime.capabilities.canDuplicate, false);
  assert.equal(emptyRuntime.capabilities.canDelete, false);
  assert.deepEqual(emptyRuntime.bottomRail.map((action) => action.key), ["stage", "timeline", "cast"]);
  assert.equal(emptyRuntime.bottomRail[2].active, true);
});

test("V2 runtime exposes beta timeline edit metadata and mode contract", () => {
  const onFormationPointerDown = () => {};
  const onV2TimelineHandlePointerDown = () => {};
  const setV2ActiveTab = () => {};
  const runtime = createV2EditorRuntime({
    activeTab: "Timeline",
    onFormationPointerDown,
    onV2TimelineHandlePointerDown,
    readonly: false,
    setV2ActiveTab,
    snapPixel: 84,
    sortedSections: [{ id: "intro" }, { id: "diamond" }],
    timelineBlockedEdge: { sectionId: "diamond", edge: "left" },
    timelineReorderGuide: { sectionId: "diamond", slotLabel: "F1" }
  });

  assert.equal(runtime.activeTab, "Timeline");
  assert.equal(runtime.timeline.snapPixel, 84);
  assert.deepEqual(runtime.timeline.timelineBlockedEdge, { sectionId: "diamond", edge: "left" });
  assert.deepEqual(runtime.timeline.timelineReorderGuide, { sectionId: "diamond", slotLabel: "F1" });
  assert.equal(runtime.capabilities.canEditTimeline, true);
  assert.equal(runtime.actions.formationPointerDown, onFormationPointerDown);
  assert.equal(runtime.actions.timelineHandlePointerDown, onV2TimelineHandlePointerDown);
  assert.equal(runtime.actions.setActiveTab, setV2ActiveTab);

  const readonlyRuntime = createV2EditorRuntime({
    activeTab: "Share",
    readonly: true,
    sortedSections: [{ id: "intro" }, { id: "diamond" }]
  });
  assert.equal(readonlyRuntime.activeTab, "Stage");
  assert.equal(readonlyRuntime.capabilities.canEditTimeline, false);
});

test("V2 runtime exposes formation rail, settings toggles, and readonly settings constraints", () => {
  const runtime = createV2EditorRuntime({
    canUseAdvancedExports: true,
    mobileContextSelection: "formation",
    readonly: false,
    selectedSection: { id: "s2", name: "Finale" },
    selectedSectionId: "s2",
    showAllTransitionPaths: true,
    showStageReferenceLabels: false,
    showStageReferences: true,
    snapEnabled: true,
    sortedSections: [{ id: "s1" }, { id: "s2" }]
  });

  assert.deepEqual(runtime.bottomRail.map((action) => action.key), ["duplicate-formation", "delete-formation", "timeline", "clear-selection"]);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-png").disabled, false);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-all-png").disabled, false);
  assert.equal(runtime.exportMenu.find((item) => item.key === "print").disabled, false);
  assert.deepEqual(
    runtime.settingsMenu.map((item) => [item.key, item.checked, Boolean(item.disabled)]),
    [
      ["toggle-snap", true, false],
      ["toggle-stage-references", true, false],
      ["toggle-stage-reference-labels", false, false],
      ["toggle-transition-paths", true, false]
    ]
  );

  const readonlyRuntime = createV2EditorRuntime({
    readonly: true,
    snapEnabled: true
  });
  assert.equal(readonlyRuntime.settingsMenu.find((item) => item.key === "toggle-snap").disabled, true);
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "export-png").disabled, true);
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "export-all-png").disabled, true);
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "print").disabled, true);
});

test("V2 coordinate adapter maps client pixels to stage meters and clamps to bounds", () => {
  const stageElement = {
    getBoundingClientRect: () => ({ left: 20, top: 10, width: 240, height: 160 })
  };

  assert.deepEqual(
    clientPointToV2Stage(stageElement, { clientX: 140, clientY: 90 }, { width: 12, height: 8 }),
    { x: 6, y: 4 }
  );
  assert.deepEqual(
    clientPointToV2Stage(stageElement, { clientX: -10, clientY: 250 }, { width: 5, height: 6 }),
    { x: 0, y: 6 }
  );
});
