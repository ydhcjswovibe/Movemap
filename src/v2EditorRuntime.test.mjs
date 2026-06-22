import assert from "node:assert/strict";
import test from "node:test";

import {
  autoTokenLabelForName,
  clientPointToV2Stage,
  createV2EditorRuntime,
  performerTokenMode,
  performerTokenTextColor,
  resolvedPerformerTokenLabel
} from "./v2EditorRuntime.mjs";

test("V2 performer token labels resolve manual, automatic, legacy, and id fallbacks", () => {
  assert.equal(autoTokenLabelForName("Ari Kim"), "AK");
  assert.equal(autoTokenLabelForName("김민지"), "김민");
  assert.equal(autoTokenLabelForName("Bo"), "Bo");
  assert.equal(autoTokenLabelForName("Charlotte"), "Cha");
  assert.equal(resolvedPerformerTokenLabel({ id: "p1", label: "Legacy", name: "" }), "Legacy");
  assert.equal(resolvedPerformerTokenLabel({ id: "p1", label: "Legacy", name: "Ari Kim", tokenLabel: "Lead" }), "Lead");
  assert.equal(resolvedPerformerTokenLabel({ id: "p1", label: "Legacy", name: "Ari Kim", tokenLabel: " " }), "AK");
  assert.equal(resolvedPerformerTokenLabel({ id: "p1", label: "", name: "" }), "p1");
  assert.equal(performerTokenMode({ tokenLabel: "Lead" }), "manual");
  assert.equal(performerTokenMode({ tokenLabel: "" }), "auto");
  assert.equal(performerTokenMode({}), "auto");
});

test("V2 performer token text color preserves contrast against performer color", () => {
  assert.equal(performerTokenTextColor("#f6e45c"), "#111827");
  assert.equal(performerTokenTextColor("#ffffff"), "#111827");
  assert.equal(performerTokenTextColor("#2457c5"), "#ffffff");
  assert.equal(performerTokenTextColor("#111827"), "#ffffff");
  assert.equal(performerTokenTextColor("#0a8"), "#111827");
  assert.equal(performerTokenTextColor("not-a-color"), "#ffffff");
});

test("V2 editor runtime exposes the stable shell, stage, selection, timeline, capability, and action contract", () => {
  const selectPerformer = () => {};
  const onFormationSelect = () => {};
  const onV2StageTap = () => {};
  const returnToProjectPicker = () => {};
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
    returnToProjectPicker,
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
  assert.equal(runtime.bottomRailMode, "default");
  assert.deepEqual(runtime.bottomRail.map((action) => action.key), ["add-formation", "formation-list", "cast-add", "cast-list", "stage-settings", "music"]);
  assert.deepEqual(runtime.cast.performers.map((performer) => [performer.id, performer.active]), [["p1", true]]);
  assert.equal(runtime.cast.canClearSelection, true);
  assert.equal(runtime.cast.canOpenRoleActions, true);
  assert.deepEqual(runtime.exportMenu.map((item) => item.key), ["export-json", "export-png", "export-all-png", "print"]);
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-json").label, "프로젝트 JSON 내보내기");
  assert.equal(runtime.exportMenu.find((item) => item.key === "export-json").scopeLabel, "Project backup");
  assert.equal(runtime.moreMenu[0].key, "settings");
  assert.equal(runtime.moreMenu[1].key, "new-project");
  assert.equal(runtime.moreMenu[1].label, "새 프로젝트");
  assert.equal(runtime.moreMenu.some((item) => item.key.startsWith("export-") || item.key === "print"), false);
  assert.equal(runtime.actions.newProject, returnToProjectPicker);
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
  assert.equal(readonlyRuntime.bottomRailMode, "default");
  assert.deepEqual(readonlyRuntime.bottomRail.map((action) => action.key), ["add-formation", "formation-list", "cast-add", "cast-list", "stage-settings", "music"]);
  assert.equal(readonlyRuntime.bottomRail.find((action) => action.key === "add-formation").disabled, true);
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
  assert.deepEqual(emptyRuntime.bottomRail.map((action) => action.key), ["add-formation", "formation-list", "cast-add", "cast-list", "stage-settings", "music"]);
  assert.equal(emptyRuntime.bottomRail.find((action) => action.key === "cast-list").active, false);
});

test("V2 runtime exposes action bar states while preserving bottom rail aliases", () => {
  const defaultRuntime = createV2EditorRuntime({
    activeTab: "Stage",
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }],
    performers: [{ id: "p1", label: "A1", name: "A1" }],
    readonly: false
  });

  assert.equal(defaultRuntime.actionBarState, "default");
  assert.deepEqual(defaultRuntime.actionBar.map((action) => action.label), [
    "대형 추가",
    "대형 목록",
    "사람 추가",
    "사람 목록",
    "무대 설정",
    "음악"
  ]);
  assert.deepEqual(defaultRuntime.bottomRail.map((action) => action.key), defaultRuntime.actionBar.map((action) => action.key));
  assert.equal(defaultRuntime.bottomRailMode, "default");

  const selectedRuntime = createV2EditorRuntime({
    mobileContextSelection: "formation",
    selectedSectionId: "intro",
    selectedSection: { id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 },
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }],
    readonly: false
  });

  assert.equal(selectedRuntime.actionBarState, "formation");
  assert.deepEqual(selectedRuntime.actionBar.map((action) => action.label), [
    "삭제",
    "복제",
    "템플릿",
    "이름/메모"
  ]);
  assert.equal(selectedRuntime.actionBar.some((action) => action.label === "해제"), false);
  assert.equal(selectedRuntime.bottomRailMode, "formation");

  const performerRuntime = createV2EditorRuntime({
    activeTab: "Stage",
    performers: [{ id: "p1", label: "A1", name: "A1" }],
    readonly: false,
    selectedPerformerId: "p1",
    selectedPerformerIds: ["p1"],
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }]
  });

  assert.equal(performerRuntime.actionBarState, "default");
  assert.deepEqual(performerRuntime.actionBar.map((action) => action.key), defaultRuntime.actionBar.map((action) => action.key));
  assert.equal(performerRuntime.actionBar.some((action) => ["duplicate-performer", "delete-performer", "align-x", "align-y"].includes(action.key)), false);

  const multiPerformerRuntime = createV2EditorRuntime({
    activeTab: "Stage",
    performers: [{ id: "p1", label: "A1" }, { id: "p2", label: "B2" }],
    readonly: false,
    selectedPerformerId: "p1",
    selectedPerformerIds: ["p1", "p2"],
    selectionMode: "multi",
    sortedSections: [{ id: "intro", name: "Intro", time: 4, end: 4, moveDuration: 4 }]
  });

  assert.equal(multiPerformerRuntime.actionBarState, "default");
  assert.deepEqual(multiPerformerRuntime.actionBar.map((action) => action.key), defaultRuntime.actionBar.map((action) => action.key));
  assert.equal(multiPerformerRuntime.actionBar.some((action) => ["delete-performers", "align-x", "align-y"].includes(action.key)), false);
});

test("V2 default bottom sheet controls rail active state and closes outside default rail mode", () => {
  const openRuntime = createV2EditorRuntime({
    activeBottomSheet: "formations",
    activeTab: "Stage",
    currentSectionId: "s2",
    performers: [{ id: "p1", label: "P1" }],
    showAllTransitionPaths: false,
    showStageReferenceLabels: true,
    showStageReferences: true,
    snapEnabled: true,
    sortedSections: [{ id: "s1", name: "Intro" }, { id: "s2", name: "Finale" }],
    stageDimensions: { width: 12, height: 8 }
  });

  assert.equal(openRuntime.bottomRailMode, "default");
  assert.equal(openRuntime.bottomRail.find((action) => action.key === "formation-list").active, true);
  assert.equal(openRuntime.bottomRail.find((action) => action.key === "stage-settings").active, false);
  assert.equal(openRuntime.bottomSheet.key, "formation-list");
  assert.deepEqual(openRuntime.bottomSheet.items.map((item) => item.key), ["formation-s1", "formation-s2"]);
  assert.equal(openRuntime.bottomSheet.items.find((item) => item.key === "formation-s2").current, true);

  const closedRuntime = createV2EditorRuntime({
    activeTab: "Cast",
    sortedSections: [{ id: "s1" }]
  });
  assert.equal(closedRuntime.bottomSheet, null);
  assert.equal(closedRuntime.bottomRail.find((action) => action.key === "cast-list").active, false);

  const selectedRuntime = createV2EditorRuntime({
    activeBottomSheet: "stage",
    activeTab: "Stage",
    selectedPerformerId: "p1",
    selectedPerformerIds: ["p1"],
    performers: [{ id: "p1", label: "P1" }]
  });
  assert.equal(selectedRuntime.bottomRailMode, "default");
  assert.equal(selectedRuntime.bottomSheet.key, "stage-settings");
});

test("V2 formation list sheet exposes fixed row labels and closes in selected context", () => {
  const runtime = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    currentSectionId: "f1",
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8, moveDuration: 4 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 }
    ],
    readonly: false
  });

  assert.equal(runtime.bottomSheet.key, "formation-list");
  assert.equal(runtime.bottomSheet.title, "대형 목록");
  assert.equal(runtime.bottomSheet.headerLabel, "대형 목록");
  assert.deepEqual(runtime.bottomSheet.headerActions.map((action) => action.key), [
    "multi-select",
    "close-sheet"
  ]);
  assert.equal(runtime.bottomSheet.headerActions.find((action) => action.key === "multi-select").disabled, false);
  assert.deepEqual(runtime.bottomSheet.items.map((item) => [item.sequenceLabel, item.label, item.timeRangeLabel]), [
    ["F1", "Intro", "4.0s ~ 8.0s"],
    ["F2", "Chorus", "12.0s ~ 16.0s"]
  ]);

  const selectedRuntime = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    currentSectionId: "f1",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 },
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8, moveDuration: 4 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 }
    ],
    readonly: false
  });
  assert.equal(selectedRuntime.bottomSheet, null);

  const readonlyRuntime = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8, moveDuration: 4 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16, moveDuration: 4 }
    ],
    readonly: true
  });

  assert.equal(readonlyRuntime.bottomSheet.headerActions.find((action) => action.key === "multi-select").disabled, true);
});

test("V2 formation list supports multi-select and empty formation state", () => {
  const multi = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    formationListMode: "multi",
    selectedFormationIds: ["f1"],
    sortedSections: [
      { id: "f1", name: "Intro", time: 8, start: 4, end: 8 },
      { id: "f2", name: "Chorus", time: 16, start: 12, end: 16 }
    ]
  });

  assert.equal(multi.bottomSheet.headerLabel, "1개 선택됨");
  assert.deepEqual(multi.bottomSheet.headerActions.map((action) => action.key), ["select-all-formations", "delete-selected-formations", "cancel-multi-select"]);
  assert.equal(multi.bottomSheet.items[0].checked, true);

  const empty = createV2EditorRuntime({
    activeBottomSheet: "formation-list",
    sortedSections: [],
    readonly: false
  });

  assert.equal(empty.bottomSheet.emptyState.label, "대형 없음");
  assert.equal(empty.bottomSheet.emptyState.action.label, "대형 추가");
});

test("V2 runtime exposes formation details and template sheets", () => {
  const runtime = createV2EditorRuntime({
    activeBottomSheet: "formation-details",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus", notes: "Hold center", time: 16, start: 12, end: 16, moveDuration: 4 },
    sortedSections: [{ id: "f2", name: "Chorus", notes: "Hold center", time: 16, start: 12, end: 16, moveDuration: 4 }],
    readonly: false
  });

  assert.equal(runtime.bottomSheet.key, "formation-details");
  assert.equal(runtime.bottomSheet.fields.name.value, "Chorus");
  assert.equal(runtime.bottomSheet.fields.notes.value, "Hold center");
  assert.equal(runtime.bottomSheet.timeRangeLabel, "12.0s ~ 16.0s");

  const templateRuntime = createV2EditorRuntime({
    activeBottomSheet: "formation-template",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus" },
    sortedSections: [{ id: "f2", name: "Chorus" }],
    formationTemplates: [{
      templateId: "v",
      label: "V",
      stage: { width: 12, height: 8 },
      positions: { a1: { x: 5, y: 3 }, a2: { x: 7, y: 3 } },
      performerCount: 2,
      gridUnit: 1,
      fitsAll: true
    }],
    selectedTemplateId: "v",
    readonly: false
  });

  assert.equal(templateRuntime.bottomSheet.key, "formation-template");
  assert.equal(templateRuntime.bottomSheet.items[0].label, "V");
  assert.equal(templateRuntime.bottomSheet.items[0].templateId, "v");
  assert.deepEqual(templateRuntime.bottomSheet.items[0].preview.positions, { a1: { x: 5, y: 3 }, a2: { x: 7, y: 3 } });
  assert.equal(templateRuntime.bottomSheet.items[0].stateLabel, "2명 · 1m Snap");
  assert.deepEqual(templateRuntime.bottomSheet.actions.map((action) => action.key), [
    "save-current-template",
    "add-template-formation"
  ]);

  const overflowRuntime = createV2EditorRuntime({
    activeBottomSheet: "formation-template",
    mobileContextSelection: "formation",
    selectedSectionId: "f2",
    selectedSection: { id: "f2", name: "Chorus" },
    sortedSections: [{ id: "f2", name: "Chorus" }],
    formationTemplates: [{ templateId: "block", label: "Block", fitsAll: false, disabledReason: "무대/인원 초과" }],
    selectedTemplateId: "block",
    readonly: false
  });

  assert.equal(overflowRuntime.bottomSheet.items[0].disabled, true);
  assert.equal(overflowRuntime.bottomSheet.items[0].stateLabel, "무대/인원 초과");
  assert.equal(overflowRuntime.bottomSheet.actions.find((action) => action.key === "add-template-formation").disabled, true);
});

test("V2 minimal cast stage and music sheets honor readonly gating", () => {
  const editable = createV2EditorRuntime({
    activeBottomSheet: "music",
    readonly: false,
    audioFileName: "song.mp3"
  });
  assert.equal(editable.bottomSheet.key, "music");
  assert.equal(editable.bottomSheet.actions.find((action) => action.key === "replace-audio").disabled, false);

  const readonly = createV2EditorRuntime({
    activeBottomSheet: "stage-settings",
    readonly: true,
    snapEnabled: true,
    showStageReferences: true,
    showStageReferenceLabels: true,
    showAllTransitionPaths: true
  });
  assert.equal(readonly.bottomSheet.key, "stage-settings");
  assert.equal(readonly.bottomSheet.items.find((item) => item.key === "toggle-snap").disabled, true);
  assert.equal(readonly.bottomSheet.items.find((item) => item.key === "front-caution-zone").disabled, true);

  const castAdd = createV2EditorRuntime({ activeBottomSheet: "cast-add", readonly: false });
  assert.equal(castAdd.bottomSheet.emptyState.label, "사람 추가는 다음 단계에서 지원합니다");
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

  assert.equal(runtime.bottomRailMode, "formation");
  assert.deepEqual(runtime.bottomRail.map((action) => action.key), ["delete-formation", "duplicate-formation", "formation-template", "formation-details"]);
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
      ["front-caution-zone", undefined, false],
      ["toggle-transition-paths", true, false]
    ]
  );

  const readonlyRuntime = createV2EditorRuntime({
    readonly: true,
    snapEnabled: true
  });
  assert.equal(readonlyRuntime.settingsMenu.find((item) => item.key === "toggle-snap").disabled, true);
  assert.equal(readonlyRuntime.settingsMenu.find((item) => item.key === "front-caution-zone").disabled, true);
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
  assert.deepEqual(runtime.cast.performers.map((performer) => [performer.id, performer.tokenLabel]), [["a1", "A1"], ["b2", "B2"]]);
  assert.equal(runtime.cast.canClearSelection, true);
  assert.equal(runtime.cast.canOpenRoleActions, true);
  assert.equal(runtime.actions.selectPerformer, selectPerformer);
  assert.equal(runtime.actions.mobileAction, handleMobileAction);
});

test("V2 cast list sheet keeps rows lightweight and opens a selected performer inspector", () => {
  const updateSelectedPerformerMetadataField = () => {};
  const finishSelectedPerformerMetadataEdit = () => {};
  const duplicateSelectedPerformer = () => {};
  const requestDeleteSelectedPerformer = () => {};
  const runtime = createV2EditorRuntime({
    activeBottomSheet: "cast-list",
    performers: [
      { id: "a1", label: "A1", name: "Ari Kim", color: "#2457c5", role: "groupA" },
      { id: "b2", label: "B2", name: "김민지", tokenLabel: "MJ", color: "#e84a7f", role: "groupB" }
    ],
    readonly: false,
    selectedPerformerId: "b2",
    selectedPerformerIds: ["b2"],
    updateSelectedPerformerMetadataField,
    finishSelectedPerformerMetadataEdit,
    duplicateSelectedPerformer,
    requestDeleteSelectedPerformer,
    performerInspectorExpanded: true
  });

  assert.equal(runtime.actionBarState, "default");
  assert.equal(runtime.bottomRailMode, "default");
  assert.equal(runtime.bottomSheet.key, "cast-list");
  assert.deepEqual(runtime.bottomSheet.items.map((item) => ({
    label: item.label,
    tokenLabel: item.tokenLabel,
    color: item.color,
    active: item.active,
    performerId: item.performerId,
    action: item.action,
    fields: item.fields
  })), [
    {
      label: "Ari Kim",
      tokenLabel: "AK",
      color: "#2457c5",
      active: false,
      performerId: "a1",
      action: "select-performer",
      fields: undefined
    },
    {
      label: "김민지",
      tokenLabel: "MJ",
      color: "#e84a7f",
      active: true,
      performerId: "b2",
      action: "select-performer",
      fields: undefined
    }
  ]);
  assert.deepEqual(runtime.bottomSheet.inspector, {
    performerId: "b2",
    name: "김민지",
    tokenLabel: "MJ",
    resolvedTokenLabel: "MJ",
    tokenMode: "manual",
    color: "#e84a7f",
    deleteConfirming: false,
    actions: [
      { key: "edit-performer", label: "편집", expanded: true },
      { key: "duplicate-performer", label: "복제", disabled: false },
      { key: "delete-performer", label: "삭제", danger: true, disabled: false }
    ],
    fields: {
      name: { label: "이름", value: "김민지", disabled: false },
      tokenLabel: { label: "토큰 표시", value: "MJ", helper: "비워두면 이름에서 자동 생성", disabled: false },
      color: { label: "색상", value: "#e84a7f", disabled: false }
    }
  });
  assert.equal(runtime.actions.updateSelectedPerformerMetadataField, updateSelectedPerformerMetadataField);
  assert.equal(runtime.actions.finishSelectedPerformerMetadataEdit, finishSelectedPerformerMetadataEdit);
  assert.equal(runtime.actions.duplicateSelectedPerformer, duplicateSelectedPerformer);
  assert.equal(runtime.actions.requestDeleteSelectedPerformer, requestDeleteSelectedPerformer);
});

test("V2 selected performer inspector stays visible but disables mutation fields in readonly and last-performer states", () => {
  const readonlyRuntime = createV2EditorRuntime({
    activeBottomSheet: "cast-list",
    performers: [{ id: "a1", label: "A1", name: "Ari Kim", color: "#2457c5" }],
    readonly: true,
    selectedPerformerId: "a1",
    selectedPerformerIds: ["a1"],
    performerInspectorExpanded: true,
    performerDeleteConfirmingId: "a1"
  });

  assert.equal(readonlyRuntime.bottomSheet.inspector.performerId, "a1");
  assert.equal(readonlyRuntime.bottomSheet.inspector.resolvedTokenLabel, "AK");
  assert.deepEqual(readonlyRuntime.bottomSheet.inspector.actions, [
    { key: "edit-performer", label: "편집", expanded: true },
    { key: "duplicate-performer", label: "복제", disabled: true },
    { key: "delete-performer", label: "삭제", danger: true, disabled: true }
  ]);
  assert.equal(readonlyRuntime.bottomSheet.inspector.fields.name.disabled, true);
  assert.equal(readonlyRuntime.bottomSheet.inspector.fields.tokenLabel.disabled, true);
  assert.equal(readonlyRuntime.bottomSheet.inspector.fields.color.disabled, true);
  assert.equal(readonlyRuntime.bottomSheet.inspector.deleteConfirming, false);

  const lastEditableRuntime = createV2EditorRuntime({
    activeBottomSheet: "cast-list",
    performers: [{ id: "a1", label: "A1", name: "Ari Kim", color: "#2457c5" }],
    readonly: false,
    selectedPerformerId: "a1",
    selectedPerformerIds: ["a1"]
  });
  assert.equal(lastEditableRuntime.bottomSheet.inspector.actions.find((action) => action.key === "delete-performer").disabled, true);
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
      ["front-caution-zone", "앞쪽 주의 구역", "6m", undefined],
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
    state: "performer",
    sectionId: "diamond",
    performerId: "b2",
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
  assert.equal(selectedRuntime.stageInfoLine.state, "selected");
  assert.equal(selectedRuntime.stageInfoLine.sectionId, "diamond");
  assert.equal(selectedRuntime.stageInfoLine.performerId, "");
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
  assert.equal(currentRuntime.stageInfoLine.state, "current");
  assert.equal(currentRuntime.stageInfoLine.sectionId, "finale");
  assert.equal(currentRuntime.stageInfoLine.leftLabel, "Finale Scene");
  assert.equal(currentRuntime.stageInfoLine.rightLabel, "Snap on · 12x8 · 1m grid");
});

test("V2 stage visual model aligns the visible grid and guides to stage dimensions", () => {
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
  assert.deepEqual(runtime.stage.cautionZone, {
    y: 6,
    yPercent: 75,
    heightPercent: 25,
    label: "앞쪽 주의 구역"
  });
  assert.equal(runtime.stage.audienceGuideYPercent, 75);
  assert.equal(runtime.stage.referencesVisible, true);
  assert.equal(runtime.stage.referenceLabelsVisible, true);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "front-line").yPercent, 75);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "center-line").xPercent, 50);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "center-line").y1Percent, 0);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "center-line").y2Percent, 100);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "left-hash").xPercent, 20.000000000000004);
  assert.equal(runtime.stage.referenceGuides.find((reference) => reference.id === "right-hash").xPercent, 80.00000000000001);

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

test("V2 stage visual model clamps caution zone and recalculates guides for changed stage dimensions", () => {
  const runtime = createV2EditorRuntime({
    frontZone: { y: 11 },
    showStageReferenceLabels: true,
    showStageReferences: true,
    stageDimensions: { width: 10, height: 6 }
  });

  assert.deepEqual(runtime.stage.grid, {
    columns: 10,
    rows: 6,
    centerXPercent: 50,
    centerYPercent: 50
  });
  assert.deepEqual(runtime.stage.cautionZone, {
    y: 6,
    yPercent: 100,
    heightPercent: 0,
    label: "앞쪽 주의 구역"
  });
  assert.equal(runtime.stage.audienceGuideYPercent, 100);

  const center = runtime.stage.referenceGuides.find((reference) => reference.id === "center-line");
  assert.equal(center.x1, 5);
  assert.equal(center.x2, 5);
  assert.equal(center.y1, 0);
  assert.equal(center.y2, 6);
  assert.equal(center.xPercent, 50);
  assert.equal(center.y1Percent, 0);
  assert.equal(center.y2Percent, 100);

  const front = runtime.stage.referenceGuides.find((reference) => reference.id === "front-line");
  assert.equal(front.x1, 0);
  assert.equal(front.x2, 10);
  assert.equal(front.y1, 6);
  assert.equal(front.y2, 6);
  assert.equal(front.yPercent, 100);
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
