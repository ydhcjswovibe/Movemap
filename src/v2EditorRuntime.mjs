import { clampStagePoint, normalizeStageDimensions } from "./stageGeometry.mjs";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function clientPointToV2Stage(stageElement, event, stage = {}) {
  const dimensions = normalizeStageDimensions(stage);
  const rect = stageElement?.getBoundingClientRect?.();
  if (!rect?.width || !rect?.height) return { x: 0, y: 0 };
  return clampStagePoint({
    x: ((event.clientX - rect.left) / rect.width) * dimensions.width,
    y: ((event.clientY - rect.top) / rect.height) * dimensions.height
  }, dimensions);
}

function selectedSectionIdFor(input) {
  return input.selectedSectionId || input.selectedSection?.id || input.selection?.selectedSectionId || input.selection?.selectedSection?.id || "";
}

function selectedSectionFor(input, selectedSectionId) {
  return input.selectedSection || input.selection?.selectedSection || normalizeArray(input.sortedSections).find((section) => section.id === selectedSectionId) || null;
}

function currentSectionIdFor(input) {
  return input.currentSectionId || input.selection?.currentSectionId || input.timeline?.currentSectionId || "";
}

const V2_TABS = ["Stage", "Timeline", "Cast"];

function activeTabFor(input) {
  const candidate = input.activeTab || input.v2ActiveTab || input.shell?.activeTab || "Stage";
  return V2_TABS.includes(candidate) ? candidate : "Stage";
}

export function createV2EditorRuntime(input = {}) {
  const selectedSectionId = selectedSectionIdFor(input);
  const selectedSection = selectedSectionFor(input, selectedSectionId);
  const selectedPerformerId = input.selectedPerformerId || input.selection?.selectedPerformerId || "";
  const selectedPerformerIds = normalizeArray(input.selectedPerformerIds || input.selection?.selectedPerformerIds);
  const sortedSections = normalizeArray(input.sortedSections || input.timeline?.sortedSections);
  const readonly = Boolean(input.readonly || input.shell?.readonly);
  const stageDimensions = normalizeStageDimensions(input.stageDimensions || input.stage?.stageDimensions);
  const hasPerformerSelection = Boolean(selectedPerformerId || selectedPerformerIds.length);
  const selectionMode = input.selectionMode || input.mobileContextSelection || input.selection?.mode || "";
  const hasFormationSelection = selectionMode === "formation" && Boolean(selectedSection);
  const canDuplicate = !readonly && (hasPerformerSelection || hasFormationSelection);
  const canDelete = !readonly && (hasPerformerSelection || Boolean(hasFormationSelection && sortedSections.length > 1));
  const activeTab = activeTabFor(input);

  const shell = {
    projectTitle: input.projectTitle || input.shell?.projectTitle || input.title || "Movemap",
    readonly,
    saveLabel: input.localSaveLabel || input.shell?.saveLabel || input.shell?.localSaveLabel || "Saved",
    localSaveLabel: input.localSaveLabel || input.shell?.localSaveLabel || input.shell?.saveLabel || "Saved",
    timeLabel: input.timeLabel || input.shell?.timeLabel || "0:00.0"
  };
  const stage = {
    dragPositions: input.dragPositions || input.stage?.dragPositions || null,
    frontZone: input.frontZone || input.stage?.frontZone || null,
    performers: normalizeArray(input.performers || input.stage?.performers),
    stageDimensions,
    visiblePositions: input.visiblePositions || input.stage?.visiblePositions || {}
  };
  const selection = {
    currentSectionId: currentSectionIdFor(input),
    selectedPerformerId,
    selectedPerformerIds,
    selectedSection,
    selectedSectionId
  };
  const timeline = {
    currentSectionId: selection.currentSectionId,
    isPlaying: Boolean(input.isPlaying || input.timeline?.isPlaying),
    playheadPixel: finiteNumber(input.playheadPixel ?? input.timeline?.playheadPixel, 0),
    sortedSections,
    ticks: normalizeArray(input.timelineTicks || input.timeline?.ticks || input.timeline?.timelineTicks),
    timelineTicks: normalizeArray(input.timelineTicks || input.timeline?.timelineTicks || input.timeline?.ticks),
    holdMoveSegments: normalizeArray(input.timelineVisualSegments || input.timeline?.holdMoveSegments || input.timeline?.timelineVisualSegments),
    timelineVisualSegments: normalizeArray(input.timelineVisualSegments || input.timeline?.timelineVisualSegments || input.timeline?.holdMoveSegments),
    contentWidth: Math.max(320, finiteNumber(input.timelineContentWidth ?? input.timeline?.contentWidth ?? input.timeline?.timelineContentWidth, 320)),
    timelineContentWidth: Math.max(320, finiteNumber(input.timelineContentWidth ?? input.timeline?.timelineContentWidth ?? input.timeline?.contentWidth, 320)),
    scrollX: Math.max(0, finiteNumber(input.timelineScrollX ?? input.timeline?.scrollX ?? input.timeline?.timelineScrollX, 0)),
    timelineScrollX: Math.max(0, finiteNumber(input.timelineScrollX ?? input.timeline?.timelineScrollX ?? input.timeline?.scrollX, 0)),
    snapPixel: input.snapPixel ?? input.timeline?.snapPixel ?? null,
    timelineBlockedEdge: input.timelineBlockedEdge || input.timeline?.timelineBlockedEdge || null,
    timelineReorderGuide: input.timelineReorderGuide || input.timeline?.timelineReorderGuide || null,
    waveformBars: normalizeArray(input.waveformBars || input.timeline?.waveformBars)
  };
  const capabilities = {
    canAddAudio: !readonly,
    canAddFormation: !readonly,
    canDelete,
    canDuplicate,
    canEditTimeline: !readonly && Boolean(sortedSections.length),
    canRedo: !readonly && !Boolean(input.redoDisabled ?? input.actions?.redoDisabled),
    canUndo: !readonly && !Boolean(input.undoDisabled ?? input.actions?.undoDisabled)
  };
  const topActions = [
    { key: "share", icon: "share", label: "공유", disabled: false },
    { key: "more", icon: "more", label: "더보기", disabled: false }
  ];
  const transportActions = [
    { key: timeline.isPlaying ? "pause" : "play", icon: timeline.isPlaying ? "pause" : "play", label: timeline.isPlaying ? "정지" : "재생", primary: true, disabled: false },
    { key: "undo", icon: "undo", label: "실행 취소", disabled: !capabilities.canUndo },
    { key: "redo", icon: "redo", label: "다시 실행", disabled: !capabilities.canRedo }
  ];
  const moreMenu = [
    { key: "settings", label: "Settings", hasSubmenu: true },
    { key: "export-json", label: readonly ? "JSON 내보내기" : "프로젝트 파일 공유" },
    { key: "export-png", label: "현재 PNG", disabled: !Boolean(input.canUseAdvancedExports) },
    { key: "project-info", label: shell.projectTitle },
    { key: "help", label: "Help / Shortcuts", disabled: true }
  ];
  const settingsMenu = [
    { key: "toggle-snap", label: "Snap", checked: Boolean(input.snapEnabled), disabled: readonly },
    { key: "toggle-stage-references", label: "Stage references", checked: Boolean(input.showStageReferences) },
    { key: "toggle-stage-reference-labels", label: "Reference labels", checked: Boolean(input.showStageReferenceLabels) },
    { key: "toggle-transition-paths", label: "Transition paths", checked: Boolean(input.showAllTransitionPaths) }
  ];
  const share = {
    canCreateViewLink: Boolean(input.canCreateViewLink),
    canManageLinks: Boolean(input.canManageLinks),
    editLinkEnabled: input.editLinkEnabled !== false,
    editLinkState: input.editLinkState || (input.editShareUrl ? "켜짐" : "없음"),
    editShareUrl: input.editShareUrl || "",
    isPending: Boolean(input.isShareOperationPending),
    readonly,
    shareUrl: input.shareUrl || "",
    viewLinkEnabled: input.viewLinkEnabled !== false,
    viewLinkState: input.viewLinkState || (input.shareUrl ? "켜짐" : "없음")
  };
  let bottomRail = [
    { key: "stage", icon: "settings", label: "Stage", mode: "Stage", active: activeTab === "Stage" },
    { key: "timeline", icon: "grid", label: "Timeline", mode: "Timeline", active: activeTab === "Timeline" },
    { key: "cast", icon: "users", label: "Cast", mode: "Cast", active: activeTab === "Cast" }
  ];
  if (hasPerformerSelection) {
    bottomRail = selectedPerformerIds.length > 1
      ? [
          { key: "align-performers", icon: "grid", label: "정렬", disabled: readonly },
          { key: "delete-performers", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "clear-selection", icon: "select", label: "해제" }
        ]
      : [
          { key: "duplicate-performer", icon: "add", label: "복제", disabled: readonly },
          { key: "delete-performer", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "performer-role", icon: "label", label: "역할", disabled: readonly },
          { key: "clear-selection", icon: "select", label: "해제" }
        ];
  } else if (hasFormationSelection) {
    bottomRail = [
      { key: "duplicate-formation", icon: "add", label: "복제", disabled: !capabilities.canDuplicate },
      { key: "delete-formation", icon: "close", label: "삭제", danger: true, disabled: !capabilities.canDelete },
      { key: "timeline", icon: "grid", label: "Timing", mode: "Timeline", active: activeTab === "Timeline", disabled: false },
      { key: "clear-selection", icon: "select", label: "해제" }
    ];
  }
  const actions = {
    addAudio: input.openAudioFilePicker,
    addFormation: input.addSection,
    delete: input.deleteSelection,
    duplicate: input.duplicateSelection,
    exportAllPng: input.exportAllPng,
    exportJson: input.exportJson,
    exportPng: input.exportPng,
    more: input.handleMobileAction,
    mobileAction: input.handleMobileAction,
    play: input.togglePlayback,
    print: input.printProject,
    redo: input.redoPlan,
    formationPointerDown: input.onFormationPointerDown,
    selectFormation: input.onFormationSelect,
    selectPerformer: input.selectPerformer,
    setActiveTab: input.setV2ActiveTab || input.setActiveTab,
    stagePointerDown: input.onV2StagePointerDown,
    stagePointerMove: input.onV2StagePointerMove,
    stagePointerUp: input.onV2StagePointerUp,
    stageTap: input.onV2StageTap,
    copyEditShareUrl: input.copyEditShareUrl,
    copyShareUrl: input.copyShareUrl,
    createShare: input.shareProject,
    setShareLinkEnabled: input.setShareLinkEnabled,
    timelineHandlePointerDown: input.onV2TimelineHandlePointerDown,
    timelinePointerDown: input.onTimelinePointerDown,
    timelinePointerMove: input.onTimelinePointerMove,
    timelinePointerUp: input.onTimelinePointerUp,
    timelineWheel: input.onTimelineWheel,
    toggleSnap: input.toggleSnap,
    toggleStageReferenceLabels: input.toggleStageReferenceLabels,
    toggleStageReferences: input.toggleStageReferences,
    toggleTransitionPaths: input.toggleTransitionPaths,
    updateSectionTiming: input.updateSectionTiming,
    undo: input.undoPlan
  };

  return {
    activeTab,
    actions,
    bottomRail,
    capabilities,
    moreMenu,
    sections: sortedSections,
    selection,
    settingsMenu,
    share,
    shell,
    stage,
    timeline,
    topActions,
    transportActions,
    timelineViewportRef: input.timelineViewportRef || null,
    projectTitle: shell.projectTitle,
    readonly,
    selectedPerformerId,
    selectedPerformerIds,
    selectedSection,
    selectedSectionId,
    sortedSections
  };
}
