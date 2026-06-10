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
  assert.deepEqual(runtime.cast.performers.map((performer) => [performer.id, performer.active]), [["p1", true]]);
  assert.equal(runtime.cast.canClearSelection, true);
  assert.equal(runtime.cast.canOpenRoleActions, true);
  assert.deepEqual(runtime.exportMenu.map((item) => item.key), ["export-json", "export-png", "export-all-png", "print"]);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-json").label, "프로젝트 JSON 내보내기");
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-json").scopeLabel, "Project backup");
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
  assert.deepEqual(readonlyRuntime.bottomRail.map((action) => action.key), ["stage", "timeline", "cast"]);
  assert.equal(readonlyRuntime.bottomRail.find((action) => action.key === "timeline").disabled, undefined);
  assert.equal(readonlyRuntime.cast.canOpenRoleActions, false);

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
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-png").scopeLabel, "Current view");
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-png").availabilityLabel, "사용 가능");
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-all-png").disabled, false);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-all-png").scopeLabel, "All formations");
  assert.equal(runtime.exportMenu.find((item) => item.key === "print").disabled, false);
  assert.equal(runtime.exportMenu.find((item) => item.key === "print").scopeLabel, "Print layout");
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
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "export-png").availabilityLabel, "플랜 업그레이드 필요");
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "export-all-png").disabled, true);
  assert.equal(readonlyRuntime.exportMenu.find((item) => item.key === "print").disabled, true);
});

test("V2 runtime exposes tab state and Cast selection action model", () => {
  const selectPerformer = () => {};
  const handleMobileAction = () => {};
  const runtime = createV2EditorRuntime({
    activeTab: "Cast",
    handleMobileAction,
    performers: [
      { id: "a1", label: "A1", role: "groupA" },
      { id: "b2", label: "B2", role: "groupB" }
    ],
    readonly: false,
    selectPerformer,
    selectedPerformerId: "b2",
    selectedPerformerIds: ["b2"]
  });

  assert.equal(runtime.activeTab, "Cast");
  assert.deepEqual(runtime.cast.performers.map((performer) => [performer.id, performer.active]), [["a1", false], ["b2", true]]);
  assert.equal(runtime.cast.canClearSelection, true);
  assert.equal(runtime.cast.canOpenRoleActions, true);
  assert.equal(runtime.actions.selectPerformer, selectPerformer);
  assert.equal(runtime.actions.mobileAction, handleMobileAction);
});

test("V2 Cast task model summarizes selection and edit action availability", () => {
  const editableRuntime = createV2EditorRuntime({
    performers: [
      { id: "a1", label: "A1", name: "Ari", role: "lead", group: "groupA" },
      { id: "b2", label: "B2", name: "Bo", role: "support", group: "groupB" }
    ],
    readonly: false,
    selectedPerformerId: "a1",
    selectedPerformerIds: ["a1"]
  });

  assert.deepEqual(editableRuntime.cast.selectedSummary, {
    id: "a1",
    label: "Ari",
    metaLabel: "groupA / lead",
    stateLabel: "선택됨"
  });
  assert.equal(editableRuntime.cast.canClearSelection, true);
  assert.equal(editableRuntime.cast.canOpenRoleActions, true);
  assert.equal(editableRuntime.cast.canDuplicate, true);
  assert.equal(editableRuntime.cast.canDelete, true);

  const emptyRuntime = createV2EditorRuntime({
    performers: [{ id: "a1", label: "A1" }],
    readonly: false
  });
  assert.equal(emptyRuntime.cast.selectedSummary.stateLabel, "선택 없음");
  assert.equal(emptyRuntime.cast.canClearSelection, false);
  assert.equal(emptyRuntime.cast.canOpenRoleActions, false);
  assert.equal(emptyRuntime.cast.canDuplicate, false);
  assert.equal(emptyRuntime.cast.canDelete, false);

  const readonlyRuntime = createV2EditorRuntime({
    performers: [{ id: "a1", label: "A1", role: "lead" }],
    readonly: true,
    selectedPerformerId: "a1",
    selectedPerformerIds: ["a1"]
  });
  assert.equal(readonlyRuntime.cast.canClearSelection, true);
  assert.equal(readonlyRuntime.cast.canOpenRoleActions, false);
  assert.equal(readonlyRuntime.cast.canDuplicate, false);
  assert.equal(readonlyRuntime.cast.canDelete, false);
});

test("V2 Stage task model exposes setting state and selected performer summary", () => {
  const runtime = createV2EditorRuntime({
    performers: [{ id: "a1", label: "A1", name: "Ari", role: "lead", group: "groupA" }],
    readonly: false,
    selectedPerformerId: "a1",
    selectedPerformerIds: ["a1"],
    showAllTransitionPaths: true,
    showStageReferenceLabels: false,
    showStageReferences: true,
    snapEnabled: true
  });

  assert.deepEqual(
    runtime.stageTask.settings.map((setting) => [setting.key, setting.label, setting.stateLabel, setting.checked]),
    [
      ["toggle-snap", "Snap", "On", true],
      ["toggle-stage-references", "Stage references", "On", true],
      ["toggle-stage-reference-labels", "Reference labels", "Off", false],
      ["toggle-transition-paths", "Transition paths", "On", true]
    ]
  );
  assert.deepEqual(runtime.stageTask.selectedPerformerSummary, {
    id: "a1",
    label: "Ari",
    metaLabel: "groupA / lead",
    stateLabel: "선택됨"
  });
  assert.equal(runtime.stageTask.canClearSelection, true);
  assert.equal(runtime.stageTask.canOpenRoleActions, true);

  const emptyRuntime = createV2EditorRuntime({ readonly: false });
  assert.equal(emptyRuntime.stageTask.selectedPerformerSummary.stateLabel, "무대 선택 없음");
  assert.equal(emptyRuntime.stageTask.canClearSelection, false);
  assert.equal(emptyRuntime.stageTask.canOpenRoleActions, false);
});

test("V2 runtime exposes a readonly-visible Stage info line", () => {
  const runtime = createV2EditorRuntime({
    performers: [
      { id: "a1", label: "A1", name: "Ari", role: "lead", group: "groupA" },
      { id: "b2", label: "B2", name: "Bo", role: "support", group: "groupB" }
    ],
    readonly: true,
    selectedPerformerId: "b2",
    selectedPerformerIds: ["b2"],
    selectedSection: { id: "diamond", name: "Diamond Form" },
    selectedSectionId: "diamond",
    snapEnabled: true,
    stageDimensions: { width: 12, height: 8 }
  });

  assert.deepEqual(runtime.stageInfoLine, {
    visible: true,
    leftLabel: "B2 · groupB",
    rightLabel: "Snap on · 12x8 · 1m grid"
  });
});

test("V2 Stage info line falls back to formation context and snap-off wording", () => {
  const selectedRuntime = createV2EditorRuntime({
    mobileContextSelection: "formation",
    selectedSection: { id: "diamond", name: "Diamond Form" },
    selectedSectionId: "diamond",
    snapEnabled: false,
    stageDimensions: { width: 12, height: 8 }
  });
  assert.equal(selectedRuntime.stageInfoLine.leftLabel, "Diamond Form");
  assert.equal(selectedRuntime.stageInfoLine.rightLabel, "Snap off · 12x8 · free move");

  const currentRuntime = createV2EditorRuntime({
    currentSectionId: "finale",
    sortedSections: [
      { id: "intro", name: "Intro V" },
      { id: "finale", name: "Finale Scene" }
    ],
    snapEnabled: true,
    stageDimensions: { width: 12, height: 8 }
  });
  assert.equal(currentRuntime.stageInfoLine.leftLabel, "Finale Scene");
  assert.equal(currentRuntime.stageInfoLine.rightLabel, "Snap on · 12x8 · 1m grid");
});

test("V2 stage visual model aligns the visible grid and guides to snap coordinates", () => {
  const runtime = createV2EditorRuntime({
    frontZone: { y: 5.6 },
    readonly: false,
    showStageReferenceLabels: true,
    showStageReferences: true,
    stageDimensions: { width: 12, height: 8 }
  });

  assert.deepEqual(runtime.stage.grid, {
    columns: 12,
    rows: 8,
    centerXPercent: 50,
    centerYPercent: 50
  });
  assert.equal(runtime.stage.audienceGuideYPercent, 75);
  assert.equal(runtime.stage.referencesVisible, true);
  assert.equal(runtime.stage.referenceLabelsVisible, true);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "front-line").yPercent, 75);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "center-line").xPercent, 50);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "left-hash").xPercent, 16.666666666666664);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "right-hash").xPercent, 83.33333333333334);

  const hiddenRuntime = createV2EditorRuntime({
    frontZone: { y: 5.6 },
    showStageReferenceLabels: false,
    showStageReferences: false,
    stageDimensions: { width: 12, height: 8 }
  });
  assert.equal(hiddenRuntime.stage.referencesVisible, false);
  assert.equal(hiddenRuntime.stage.referenceLabelsVisible, false);
  assert.deepEqual(hiddenRuntime.stage.referenceGuides, []);
  assert.equal(hiddenRuntime.stage.grid.columns, 12);
});

test("V2 Timeline task model summarizes selected formation and edit availability", () => {
  const runtime = createV2EditorRuntime({
    mobileContextSelection: "formation",
    readonly: false,
    selectedSection: {
      id: "diamond",
      name: "Diamond",
      time: 12,
      start: 10,
      end: 16
    },
    selectedSectionId: "diamond",
    sortedSections: [
      { id: "intro", name: "Intro", time: 0, start: 0, end: 8 },
      { id: "diamond", name: "Diamond", time: 12, start: 10, end: 16 }
    ]
  });

  assert.deepEqual(runtime.timelineTask.selectedFormationSummary, {
    id: "diamond",
    name: "Diamond",
    timeRangeLabel: "10.0s - 16.0s",
    durationLabel: "6.0s",
    trimStateLabel: "Trim enabled"
  });
  assert.equal(runtime.timelineTask.canTrimSelectedFormation, true);
  assert.equal(runtime.timelineTask.canAddFormation, true);
  assert.equal(runtime.timelineTask.canAddAudio, true);
  assert.equal(runtime.timelineTask.focusLabel, "Selected: Diamond");

  const readonlyRuntime = createV2EditorRuntime({
    mobileContextSelection: "formation",
    readonly: true,
    selectedSection: { id: "diamond", name: "Diamond", time: 12, start: 10, end: 16 },
    selectedSectionId: "diamond",
    sortedSections: [{ id: "diamond", name: "Diamond", time: 12, start: 10, end: 16 }]
  });
  assert.equal(readonlyRuntime.timelineTask.canTrimSelectedFormation, false);
  assert.equal(readonlyRuntime.timelineTask.selectedFormationSummary.trimStateLabel, "Trim locked");
  assert.equal(readonlyRuntime.timelineTask.canAddFormation, false);
  assert.equal(readonlyRuntime.timelineTask.canAddAudio, false);
});

test("V2 Export model keeps JSON available and plan-gates render artifacts", () => {
  const runtime = createV2EditorRuntime({ canUseAdvancedExports: false });
  assert.deepEqual(
    runtime.exportMenu.map((item) => [item.key, item.scopeLabel, item.availabilityLabel, item.disabled]),
    [
      ["export-json", "Project backup", "Recovery file", false],
      ["export-png", "Current view", "플랜 업그레이드 필요", true],
      ["export-all-png", "All formations", "플랜 업그레이드 필요", true],
      ["print", "Print layout", "플랜 업그레이드 필요", true]
    ]
  );
  assert.equal(runtime.exportMenu.every((item) => item.kind === "artifact"), true);

  const proRuntime = createV2EditorRuntime({ canUseAdvancedExports: true });
  assert.equal(proRuntime.exportMenu.find((item) => item.key === "export-json").disabled, false);
  assert.equal(proRuntime.exportMenu.find((item) => item.key === "export-png").disabled, false);
  assert.equal(proRuntime.exportMenu.find((item) => item.key === "print").availabilityLabel, "사용 가능");
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
