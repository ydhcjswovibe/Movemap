import { clampStagePoint, normalizeStageDimensions } from "./stageGeometry.mjs";
import { stageReferenceRenderItems } from "./stageReference.mjs";

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

function performerDisplayLabel(performer) {
  return String(performer?.name || performer?.label || performer?.id || "").trim() || "Performer";
}

function performerMetaLabel(performer) {
  const parts = [performer?.group, performer?.role].map((part) => String(part || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" / ") : "No role";
}

function performerStageInfoLabel(performer) {
  return String(performer?.label || performer?.name || performer?.id || "").trim() || "Performer";
}

function selectedPerformerSummaryFor(performers, selectedPerformerId, selectedPerformerIds, emptyStateLabel) {
  const ids = normalizeArray(selectedPerformerIds);
  const selected = performers.find((performer) => performer.id === selectedPerformerId)
    || performers.find((performer) => ids.includes(performer.id))
    || null;
  if (!selected) {
    return {
      id: "",
      label: "No performer",
      metaLabel: "No role",
      stateLabel: emptyStateLabel
    };
  }
  return {
    id: selected.id,
    label: performerDisplayLabel(selected),
    metaLabel: performerMetaLabel(selected),
    stateLabel: ids.length > 1 ? `${ids.length}명 선택됨` : "선택됨"
  };
}

function formatSeconds(value) {
  return `${finiteNumber(value, 0).toFixed(1)}s`;
}

function stageDimensionLabel(dimensions) {
  return `${Math.round(finiteNumber(dimensions.width, 12))}x${Math.round(finiteNumber(dimensions.height, 8))}`;
}

function percentOf(value, max) {
  const maximum = Math.max(1, finiteNumber(max, 1));
  return (finiteNumber(value, 0) / maximum) * 100;
}

function snapStageMeter(value, max) {
  const maximum = Math.max(1, finiteNumber(max, 1));
  return Math.max(0, Math.min(maximum, Math.round(finiteNumber(value, 0))));
}

function clampStageMeter(value, max) {
  const maximum = Math.max(1, finiteNumber(max, 1));
  return Math.max(0, Math.min(maximum, finiteNumber(value, maximum * 0.7)));
}

function cautionZoneFor(input, dimensions) {
  const y = snapStageMeter((input.frontZone || input.stage?.frontZone)?.y ?? dimensions.height * 0.7, dimensions.height);
  const yPercent = percentOf(y, dimensions.height);
  return {
    y,
    yPercent,
    heightPercent: Math.max(0, 100 - yPercent),
    label: "앞쪽 주의 구역"
  };
}

function stageGridFor(dimensions) {
  return {
    columns: Math.max(1, Math.round(dimensions.width)),
    rows: Math.max(1, Math.round(dimensions.height)),
    centerXPercent: percentOf(dimensions.width / 2, dimensions.width),
    centerYPercent: percentOf(dimensions.height / 2, dimensions.height)
  };
}

function stageGuideForReference(reference, dimensions) {
  const guide = {
    id: reference.id,
    type: reference.type,
    label: reference.label,
    tone: reference.tone,
    style: reference.style || {}
  };
  if (reference.type === "point") {
    const x = clampStageMeter(reference.x, dimensions.width);
    const y = clampStageMeter(reference.y, dimensions.height);
    return {
      ...guide,
      x,
      y,
      xPercent: percentOf(x, dimensions.width),
      yPercent: percentOf(y, dimensions.height)
    };
  }
  const x1 = clampStageMeter(reference.x1, dimensions.width);
  const y1 = clampStageMeter(reference.y1, dimensions.height);
  const x2 = clampStageMeter(reference.x2, dimensions.width);
  const y2 = clampStageMeter(reference.y2, dimensions.height);
  return {
    ...guide,
    x1,
    y1,
    x2,
    y2,
    x1Percent: percentOf(x1, dimensions.width),
    y1Percent: percentOf(y1, dimensions.height),
    x2Percent: percentOf(x2, dimensions.width),
    y2Percent: percentOf(y2, dimensions.height),
    ...(x1 === x2 ? { xPercent: percentOf(x1, dimensions.width) } : {}),
    ...(y1 === y2 ? { yPercent: percentOf(y1, dimensions.height) } : {})
  };
}

function stageReferenceGuidesFor(input, dimensions) {
  const referencesVisible = input.showStageReferences !== false;
  if (!referencesVisible) return [];
  const sourceFrontZone = input.frontZone || input.stage?.frontZone || {};
  const gridFrontZone = {
    ...sourceFrontZone,
    y: snapStageMeter(sourceFrontZone.y ?? dimensions.height * 0.7, dimensions.height)
  };
  return stageReferenceRenderItems(input.stageReferences || input.stage?.stageReferences, {
    frontZone: gridFrontZone,
    showLabels: input.showStageReferenceLabels !== false,
    stage: dimensions,
    visible: true
  }).map((reference) => stageGuideForReference(reference, dimensions));
}

function formationTimingFor(section) {
  const start = finiteNumber(section?.start ?? section?.time, 0);
  const fallbackEnd = start + finiteNumber(section?.durationSeconds ?? section?.duration ?? section?.moveDuration, 0);
  const end = finiteNumber(section?.end, fallbackEnd);
  return {
    start,
    end: Math.max(start, end),
    duration: Math.max(0, Math.max(start, end) - start)
  };
}

function sectionDisplayName(section) {
  return String(section?.name || section?.label || section?.id || "").trim() || "Formation";
}

function stageSheetToggleItem(key, label, checked, disabled = false) {
  return {
    key,
    kind: "toggle",
    label,
    stateLabel: checked ? "켜짐" : "꺼짐",
    checked: Boolean(checked),
    disabled: Boolean(disabled)
  };
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
  const activeBottomSheet = ["formations", "cast", "stage"].includes(input.activeBottomSheet || input.activeV2BottomSheet)
    ? (input.activeBottomSheet || input.activeV2BottomSheet)
    : null;
  const currentSectionId = currentSectionIdFor(input);
  const currentSection = normalizeArray(input.sortedSections || input.timeline?.sortedSections).find((section) => section.id === currentSectionId) || null;
  const cautionZone = cautionZoneFor(input, stageDimensions);

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
    cautionZone,
    grid: stageGridFor(stageDimensions),
    performers: normalizeArray(input.performers || input.stage?.performers),
    referenceGuides: stageReferenceGuidesFor(input, stageDimensions),
    referenceLabelsVisible: input.showStageReferences !== false && input.showStageReferenceLabels !== false,
    referencesVisible: input.showStageReferences !== false,
    stageDimensions,
    audienceGuideYPercent: cautionZone.yPercent,
    visiblePositions: input.visiblePositions || input.stage?.visiblePositions || {}
  };
  const selection = {
    currentSectionId,
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
    viewportWidth: Math.max(0, finiteNumber(input.timelineViewportWidth ?? input.timeline?.viewportWidth ?? input.timeline?.timelineViewportWidth, 0)),
    timelineViewportWidth: Math.max(0, finiteNumber(input.timelineViewportWidth ?? input.timeline?.timelineViewportWidth ?? input.timeline?.viewportWidth, 0)),
    scrollX: Math.max(0, finiteNumber(input.timelineScrollX ?? input.timeline?.scrollX ?? input.timeline?.timelineScrollX, 0)),
    timelineScrollX: Math.max(0, finiteNumber(input.timelineScrollX ?? input.timeline?.timelineScrollX ?? input.timeline?.scrollX, 0)),
    snapPixel: input.snapPixel ?? input.timeline?.snapPixel ?? null,
    timelineBlockedEdge: input.timelineBlockedEdge || input.timeline?.timelineBlockedEdge || null,
    timelineBlockDragPreview: input.timelineBlockDragPreview || input.timeline?.timelineBlockDragPreview || null,
    timelineReorderGuide: input.timelineReorderGuide || input.timeline?.timelineReorderGuide || null,
    waveformBars: normalizeArray(input.waveformBars || input.timeline?.waveformBars),
    waveformPlayedPercent: finiteNumber(input.waveformPlayedPercent ?? input.timeline?.waveformPlayedPercent, 0),
    waveformStatus: input.waveformStatus || input.timeline?.waveformStatus || "idle"
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
  const cast = {
    performers: stage.performers.map((performer) => ({
      ...performer,
      active: performer.id === selectedPerformerId || selectedPerformerIds.includes(performer.id),
      disabled: false
    })),
    selectedPerformerId,
    selectedPerformerIds,
    selectedSummary: selectedPerformerSummaryFor(stage.performers, selectedPerformerId, selectedPerformerIds, "선택 없음"),
    canClearSelection: hasPerformerSelection,
    canOpenRoleActions: !readonly && Boolean(selectedPerformerId),
    canDuplicate: capabilities.canDuplicate && hasPerformerSelection,
    canDelete: capabilities.canDelete && hasPerformerSelection
  };
  const stageInfoPerformer = stage.performers.find((performer) => performer.id === selectedPerformerId)
    || stage.performers.find((performer) => selectedPerformerIds.includes(performer.id))
    || null;
  const stageInfoFormation = selectedSection || currentSection || sortedSections[0] || null;
  const stageInfoLine = {
    visible: true,
    leftLabel: stageInfoPerformer
      ? `${performerStageInfoLabel(stageInfoPerformer)} · ${String(stageInfoPerformer.group || stageInfoPerformer.role || "No role").trim()}`
      : String(stageInfoFormation?.name || stageInfoFormation?.label || stageInfoFormation?.id || "No formation").trim(),
    rightLabel: `${input.snapEnabled === false ? "Snap off" : "Snap on"} · ${stageDimensionLabel(stageDimensions)} · ${input.snapEnabled === false ? "free move" : "1m grid"}`
  };
  const topActions = [
    { key: "share", icon: "share", label: "공유", disabled: false },
    { key: "export", icon: "download", label: "내보내기", disabled: false },
    { key: "more", icon: "more", label: "더보기", disabled: false }
  ];
  const transportActions = [
    { key: timeline.isPlaying ? "pause" : "play", icon: timeline.isPlaying ? "pause" : "play", label: timeline.isPlaying ? "정지" : "재생", primary: true, disabled: false },
    { key: "undo", icon: "undo", label: "실행 취소", disabled: !capabilities.canUndo },
    { key: "redo", icon: "redo", label: "다시 실행", disabled: !capabilities.canRedo }
  ];
  const moreMenu = [
    { key: "settings", label: "Settings", hasSubmenu: true },
    { key: "project-info", label: shell.projectTitle },
    { key: "help", label: "Help / Shortcuts", disabled: true }
  ];
  const hasAdvancedExports = Boolean(input.canUseAdvancedExports);
  const exportMenu = [
    {
      key: "export-json",
      kind: "artifact",
      label: "프로젝트 JSON 내보내기",
      scopeLabel: "Project backup",
      availabilityLabel: "Recovery file",
      disabled: false
    },
    {
      key: "export-png",
      kind: "artifact",
      label: "현재 PNG",
      scopeLabel: "Current view",
      availabilityLabel: hasAdvancedExports ? "사용 가능" : "플랜 업그레이드 필요",
      disabled: !hasAdvancedExports
    },
    {
      key: "export-all-png",
      kind: "artifact",
      label: "전체 대형 PNG",
      scopeLabel: "All formations",
      availabilityLabel: hasAdvancedExports ? "사용 가능" : "플랜 업그레이드 필요",
      disabled: !hasAdvancedExports
    },
    {
      key: "print",
      kind: "artifact",
      label: "인쇄/PDF",
      scopeLabel: "Print layout",
      availabilityLabel: hasAdvancedExports ? "사용 가능" : "플랜 업그레이드 필요",
      disabled: !hasAdvancedExports
    }
  ];
  const settingsMenu = [
    { key: "toggle-snap", label: "Snap", checked: Boolean(input.snapEnabled), disabled: readonly },
    { key: "toggle-stage-references", label: "Stage references", checked: Boolean(input.showStageReferences) },
    { key: "toggle-stage-reference-labels", label: "Reference labels", checked: Boolean(input.showStageReferenceLabels) },
    {
      key: "front-caution-zone",
      label: "앞쪽 주의 구역",
      kind: "meter",
      value: cautionZone.y,
      min: 0,
      max: stageDimensions.height,
      step: 1,
      disabled: readonly,
      stateLabel: `${cautionZone.y}m`
    },
    { key: "toggle-transition-paths", label: "Transition paths", checked: Boolean(input.showAllTransitionPaths) }
  ];
  const stageTask = {
    settings: settingsMenu.map((setting) => ({
      ...setting,
      stateLabel: setting.stateLabel || (setting.checked ? "On" : "Off")
    })),
    selectedPerformerSummary: selectedPerformerSummaryFor(stage.performers, selectedPerformerId, selectedPerformerIds, "무대 선택 없음"),
    canClearSelection: hasPerformerSelection,
    canOpenRoleActions: !readonly && Boolean(selectedPerformerId)
  };
  const selectedFormationTiming = formationTimingFor(selectedSection);
  const selectedFormationName = selectedSection?.name || selectedSection?.label || selectedSection?.id || "";
  const selectedFormationSummary = selectedSection
    ? {
        id: selectedSection.id || selectedSectionId,
        name: selectedFormationName || "Selected formation",
        timeRangeLabel: `${formatSeconds(selectedFormationTiming.start)} - ${formatSeconds(selectedFormationTiming.end)}`,
        durationLabel: formatSeconds(selectedFormationTiming.duration),
        trimStateLabel: capabilities.canEditTimeline ? "Trim enabled" : "Trim locked"
      }
    : {
        id: "",
        name: "No formation selected",
        timeRangeLabel: "Select a block",
        durationLabel: "0.0s",
        trimStateLabel: capabilities.canEditTimeline ? "Select to trim" : "Trim locked"
      };
  const timelineTask = {
    selectedFormationSummary,
    canTrimSelectedFormation: capabilities.canEditTimeline && Boolean(selectedSection),
    canAddFormation: capabilities.canAddFormation,
    canAddAudio: capabilities.canAddAudio,
    focusLabel: selectedSection ? `Selected: ${selectedFormationSummary.name}` : "No selected block"
  };
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
  let bottomRailMode = "default";
  let bottomRail = [
    { key: "formations", icon: "layer", label: "대형", mode: "Timeline", sheet: "formations", active: activeBottomSheet ? activeBottomSheet === "formations" : activeTab === "Timeline" },
    { key: "cast", icon: "users", label: "사람", mode: "Cast", sheet: "cast", active: activeBottomSheet ? activeBottomSheet === "cast" : activeTab === "Cast" },
    { key: "stage", icon: "grid", label: "무대", mode: "Stage", sheet: "stage", active: activeBottomSheet ? activeBottomSheet === "stage" : activeTab === "Stage" }
  ];
  if (hasPerformerSelection) {
    bottomRailMode = "performer";
    bottomRail = selectedPerformerIds.length > 1
      ? [
          { key: "align-x", icon: "grid", label: "세로", disabled: readonly },
          { key: "align-y", icon: "grid", label: "가로", disabled: readonly },
          { key: "delete-performers", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "clear-selection", icon: "select", label: "해제" }
        ]
      : [
          { key: "duplicate-performer", icon: "add", label: "복제", disabled: readonly },
          { key: "delete-performer", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "cast", icon: "users", label: "사람", mode: "Cast", active: activeTab === "Cast", disabled: false },
          { key: "clear-selection", icon: "select", label: "해제" }
        ];
  } else if (hasFormationSelection) {
    bottomRailMode = "formation";
    bottomRail = [
      { key: "formation-list", icon: "layer", label: "목록", mode: "Timeline", active: activeTab === "Timeline", disabled: false },
      { key: "add-formation", icon: "add", label: "추가", disabled: !capabilities.canAddFormation },
      { key: "duplicate-formation", icon: "add", label: "복제", disabled: !capabilities.canDuplicate },
      { key: "delete-formation", icon: "close", label: "삭제", danger: true, disabled: !capabilities.canDelete },
      { key: "clear-selection", icon: "select", label: "해제" }
    ];
  }
  const bottomSheet = bottomRailMode === "default" && activeBottomSheet ? {
    key: activeBottomSheet,
    title: activeBottomSheet === "formations" ? "대형" : activeBottomSheet === "cast" ? "사람" : "무대",
    items: activeBottomSheet === "formations"
      ? [
          ...sortedSections.map((section) => {
            const timing = formationTimingFor(section);
            const isCurrent = section.id === currentSectionId;
            return {
              key: `formation-${section.id}`,
              kind: "formation",
              label: sectionDisplayName(section),
              metaLabel: `${formatSeconds(timing.start)} - ${formatSeconds(timing.end)}`,
              stateLabel: isCurrent ? "현재" : "",
              sectionId: section.id,
              active: isCurrent,
              action: "select-formation"
            };
          }),
          { key: "add-formation", kind: "command", icon: "add", label: "대형 추가", disabled: !capabilities.canAddFormation, action: "add-formation" }
        ]
      : activeBottomSheet === "cast"
        ? cast.performers.map((performer) => ({
            key: `cast-${performer.id}`,
            kind: "performer",
            label: performerDisplayLabel(performer),
            metaLabel: performerMetaLabel(performer),
            stateLabel: performer.active ? "선택됨" : "",
            performerId: performer.id,
            active: Boolean(performer.active),
            action: "select-performer"
          }))
        : [
            {
              key: "stage-size",
              kind: "info",
              label: "무대 크기",
              stateLabel: `${stageDimensionLabel(stageDimensions)} · 1m grid`
            },
            stageSheetToggleItem("toggle-snap", "스냅", input.snapEnabled !== false, readonly),
            stageSheetToggleItem("toggle-stage-references", "참조선", input.showStageReferences !== false),
            stageSheetToggleItem("toggle-stage-reference-labels", "참조선 라벨", input.showStageReferences !== false && input.showStageReferenceLabels !== false),
            stageSheetToggleItem("toggle-transition-paths", "동선", Boolean(input.showAllTransitionPaths))
          ]
  } : null;
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
    timelineViewportMeasured: input.onTimelineViewportMeasured,
    timelineWheel: input.onTimelineWheel,
    zoomTimelineBy: input.zoomTimelineBy,
    toggleSnap: input.toggleSnap,
    toggleStageReferenceLabels: input.toggleStageReferenceLabels,
    toggleStageReferences: input.toggleStageReferences,
    toggleTransitionPaths: input.toggleTransitionPaths,
    toggleBottomSheet: input.toggleBottomSheet,
    updateFrontCautionZone: input.updateFrontCautionZone,
    updateSectionTiming: input.updateSectionTiming,
    undo: input.undoPlan
  };

  return {
    activeTab,
    actions,
    activeBottomSheet,
    bottomRail,
    bottomRailMode,
    bottomSheet,
    capabilities,
    cast,
    exportMenu,
    moreMenu,
    sections: sortedSections,
    selection,
    settingsMenu,
    share,
    shell,
    stage,
    stageInfoLine,
    stageTask,
    timeline,
    timelineTask,
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
