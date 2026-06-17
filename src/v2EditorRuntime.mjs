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

function formationSequenceLabel(index) {
  return `F${index + 1}`;
}

function formationRangeLabel(section) {
  const timing = formationTimingFor(section);
  return `${formatSeconds(timing.start)} ~ ${formatSeconds(timing.end)}`;
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

const V2_ACTION_SHEET_KEYS = new Set([
  "formation-list",
  "formation-details",
  "formation-template",
  "cast-list",
  "cast-add",
  "stage-settings",
  "music"
]);

function normalizedActionSheetKey(value) {
  if (V2_ACTION_SHEET_KEYS.has(value)) return value;
  if (value === "formations") return "formation-list";
  if (value === "cast") return "cast-list";
  if (value === "stage") return "stage-settings";
  return null;
}

function defaultActionBar({ capabilities, activeBottomSheet }) {
  return [
    { key: "add-formation", icon: "add", label: "대형 추가", action: "add-formation", disabled: !capabilities.canAddFormation },
    { key: "formation-list", icon: "layer", label: "대형 목록", sheet: "formation-list", active: activeBottomSheet === "formation-list" },
    { key: "cast-add", icon: "add", label: "사람 추가", sheet: "cast-add", active: activeBottomSheet === "cast-add", disabled: false },
    { key: "cast-list", icon: "users", label: "사람 목록", sheet: "cast-list", active: activeBottomSheet === "cast-list" },
    { key: "stage-settings", icon: "grid", label: "무대 설정", sheet: "stage-settings", active: activeBottomSheet === "stage-settings" },
    { key: "music", icon: "music", label: "음악", sheet: "music", active: activeBottomSheet === "music" }
  ];
}

function formationActionBar({ capabilities, activeBottomSheet }) {
  return [
    { key: "delete-formation", icon: "close", label: "삭제", action: "delete-formation", danger: true, disabled: !capabilities.canDelete },
    { key: "duplicate-formation", icon: "add", label: "복제", action: "duplicate-formation", disabled: !capabilities.canDuplicate },
    { key: "formation-template", icon: "sparkle", label: "템플릿", sheet: "formation-template", active: activeBottomSheet === "formation-template" },
    { key: "add-formation", icon: "add", label: "대형 추가", action: "add-formation", disabled: !capabilities.canAddFormation },
    { key: "formation-list", icon: "layer", label: "대형 목록", sheet: "formation-list", active: activeBottomSheet === "formation-list" },
    { key: "formation-details", icon: "edit", label: "이름/메모", sheet: "formation-details", active: activeBottomSheet === "formation-details" }
  ];
}

export function createV2EditorRuntime(input = {}) {
  const selectedSectionId = selectedSectionIdFor(input);
  const selectedSection = selectedSectionFor(input, selectedSectionId);
  const selectedPerformerId = input.selectedPerformerId || input.selection?.selectedPerformerId || "";
  const selectedPerformerIds = normalizeArray(input.selectedPerformerIds || input.selection?.selectedPerformerIds);
  const formationListMode = input.formationListMode === "multi" ? "multi" : "normal";
  const selectedFormationIds = normalizeArray(input.selectedFormationIds);
  const sortedSections = normalizeArray(input.sortedSections || input.timeline?.sortedSections);
  const readonly = Boolean(input.readonly || input.shell?.readonly);
  const stageDimensions = normalizeStageDimensions(input.stageDimensions || input.stage?.stageDimensions);
  const hasPerformerSelection = Boolean(selectedPerformerId || selectedPerformerIds.length);
  const selectionMode = input.selectionMode || input.mobileContextSelection || input.selection?.mode || "";
  const hasFormationSelection = selectionMode === "formation" && Boolean(selectedSection);
  const canDuplicate = !readonly && (hasPerformerSelection || hasFormationSelection);
  const canDelete = !readonly && (hasPerformerSelection || Boolean(hasFormationSelection));
  const activeTab = activeTabFor(input);
  const activeBottomSheet = normalizedActionSheetKey(input.activeBottomSheet || input.activeV2BottomSheet);
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
  let actionBarState = "default";
  let actionBar = defaultActionBar({ capabilities, activeBottomSheet });
  if (hasPerformerSelection) {
    actionBarState = "performer";
    actionBar = selectedPerformerIds.length > 1
      ? [
          { key: "align-x", icon: "grid", label: "세로", disabled: readonly },
          { key: "align-y", icon: "grid", label: "가로", disabled: readonly },
          { key: "delete-performers", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "clear-selection", icon: "select", label: "해제" }
        ]
      : [
          { key: "duplicate-performer", icon: "add", label: "복제", disabled: readonly },
          { key: "delete-performer", icon: "close", label: "삭제", danger: true, disabled: readonly },
          { key: "cast-list", icon: "users", label: "사람 목록", sheet: "cast-list", active: activeBottomSheet === "cast-list", disabled: false },
          { key: "clear-selection", icon: "select", label: "해제" }
        ];
  } else if (hasFormationSelection) {
    actionBarState = "formation";
    actionBar = formationActionBar({ capabilities, activeBottomSheet });
  }
  const bottomRailMode = actionBarState;
  const bottomRail = actionBar;
  const formationSheetKeys = new Set(["formation-list", "formation-details", "formation-template"]);
  const shouldRenderBottomSheet = Boolean(activeBottomSheet && (actionBarState === "default" || formationSheetKeys.has(activeBottomSheet)));
  const selectedFormationForSheet = hasFormationSelection ? selectedSection : null;
  const selectedFormationIndex = sortedSections.findIndex((section) => section.id === selectedSectionId);
  const safeSelectedFormationIndex = Math.max(0, selectedFormationIndex);
  const formationTemplateItems = normalizeArray(input.formationTemplates);
  const selectedTemplateForSheet = formationTemplateItems.find((template) => template.id === input.selectedTemplateId || template.templateId === input.selectedTemplateId)
    || formationTemplateItems[0]
    || null;
  const selectedTemplateFits = selectedTemplateForSheet?.fitsAll !== false;
  const bottomSheet = shouldRenderBottomSheet ? {
    key: activeBottomSheet,
    title: activeBottomSheet === "formation-list" ? "대형 목록" : activeBottomSheet === "formation-details" ? "이름/메모" : activeBottomSheet === "formation-template" ? "템플릿" : activeBottomSheet === "cast-list" ? "사람 목록" : activeBottomSheet === "cast-add" ? "사람 추가" : activeBottomSheet === "music" ? "음악" : "무대 설정",
    ...(activeBottomSheet === "formation-list" ? {
      headerLabel: formationListMode === "multi"
        ? `${selectedFormationIds.length}개 선택됨`
        : selectedFormationForSheet ? `${formationSequenceLabel(safeSelectedFormationIndex)} ${sectionDisplayName(selectedFormationForSheet)}` : "대형 목록",
      headerActions: formationListMode === "multi"
        ? [
            { key: "select-all-formations", icon: "select", label: "전체선택", disabled: readonly || !sortedSections.length },
            { key: "delete-selected-formations", icon: "close", label: "삭제", danger: true, sectionIds: selectedFormationIds, disabled: readonly || !selectedFormationIds.length },
            { key: "cancel-multi-select", icon: "close", label: "취소" }
          ]
        : selectedFormationForSheet ? [
            { key: "delete-formation", icon: "close", label: "삭제", danger: true, disabled: readonly },
            { key: "duplicate-formation", icon: "add", label: "복제", disabled: readonly },
            { key: "formation-template", icon: "sparkle", label: "템플릿", sheet: "formation-template", disabled: readonly },
            { key: "formation-details", icon: "edit", label: "이름", sheet: "formation-details", disabled: readonly },
            { key: "multi-select", icon: "select", label: "다중선택", disabled: readonly || !sortedSections.length },
            { key: "close-sheet", icon: "close", label: "닫기" }
          ] : [
            { key: "multi-select", icon: "select", label: "다중선택", disabled: readonly || !sortedSections.length },
            { key: "close-sheet", icon: "close", label: "닫기" }
          ],
      emptyState: sortedSections.length ? null : {
        label: "대형 없음",
        action: { key: "add-formation", label: "대형 추가", disabled: readonly }
      }
    } : activeBottomSheet === "formation-details" ? {
      headerLabel: selectedFormationForSheet ? `${formationSequenceLabel(safeSelectedFormationIndex)} ${sectionDisplayName(selectedFormationForSheet)}` : "대형 없음",
      fields: {
        name: { label: "이름", value: selectedFormationForSheet?.name || "", disabled: readonly || !selectedFormationForSheet },
        notes: { label: "메모", value: selectedFormationForSheet?.notes || "", disabled: readonly || !selectedFormationForSheet }
      },
      timeRangeLabel: selectedFormationForSheet ? formationRangeLabel(selectedFormationForSheet) : "",
      headerActions: [
        { key: "close-sheet", icon: "close", label: "닫기" }
      ]
    } : activeBottomSheet === "formation-template" ? {
      headerLabel: selectedFormationForSheet ? `${formationSequenceLabel(safeSelectedFormationIndex)} ${sectionDisplayName(selectedFormationForSheet)}` : "대형 없음",
      actions: [
        { key: "save-current-template", label: "현재 대형 저장", disabled: readonly || !selectedFormationForSheet },
        { key: "add-template-formation", label: "새 대형으로 추가", disabled: readonly || !selectedFormationForSheet || !selectedTemplateFits }
      ],
      headerActions: [
        { key: "close-sheet", icon: "close", label: "닫기" }
      ]
    } : activeBottomSheet === "cast-add" ? {
      emptyState: { label: "사람 추가는 다음 단계에서 지원합니다" }
    } : activeBottomSheet === "music" ? {
      stateLabel: input.audioFileName || input.musicTitle || "음악 없음",
      actions: [
        { key: "replace-audio", label: input.audioFileName || input.musicTitle ? "교체" : "업로드", disabled: readonly }
      ]
    } : {}),
    items: activeBottomSheet === "formation-list"
      ? sortedSections.map((section, index) => ({
          key: `formation-${section.id}`,
          kind: "formation-row",
          sectionId: section.id,
          sequenceLabel: formationSequenceLabel(index),
          label: sectionDisplayName(section),
          timeRangeLabel: formationRangeLabel(section),
          active: section.id === selectedSectionId,
          current: section.id === currentSectionId,
          checked: selectedFormationIds.includes(section.id),
          action: formationListMode === "multi" ? "toggle-formation-selection" : "select-formation"
        }))
      : activeBottomSheet === "formation-template"
        ? formationTemplateItems.map((template) => ({
            key: `formation-template-${template.templateId || template.id}`,
            kind: "formation-template",
            templateId: template.templateId || template.id,
            label: template.label || template.name || template.id,
            preview: {
              stage: template.stage,
              positions: template.positions,
              performerCount: template.performerCount,
              gridUnit: template.gridUnit,
              fitsAll: template.fitsAll !== false,
              disabledReason: template.disabledReason || ""
            },
            disabled: readonly || !selectedFormationForSheet || template.fitsAll === false,
            stateLabel: template.fitsAll === false ? template.disabledReason || "무대/인원 초과" : `${template.performerCount ?? Object.keys(template.positions || {}).length}명 · 1m Snap`,
            active: (template.templateId || template.id) === input.selectedTemplateId
          }))
      : activeBottomSheet === "cast-list"
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
        : activeBottomSheet === "cast-add"
          ? []
          : activeBottomSheet === "music"
            ? []
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
            {
              key: "front-caution-zone",
              kind: "meter",
              label: "앞쪽 주의 구역",
              stateLabel: `${cautionZone.y}m`,
              disabled: readonly
            },
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
    enterFormationMultiSelect: input.enterFormationMultiSelect,
    cancelFormationMultiSelect: input.cancelFormationMultiSelect,
    toggleFormationMultiSelect: input.toggleFormationMultiSelect,
    selectAllFormations: input.selectAllFormations,
    deleteSelectedFormations: (ids = selectedFormationIds) => input.deleteSelectedFormations?.(ids),
    updateSelectedFormationMetadataField: input.updateSelectedFormationMetadataField,
    finishSelectedFormationMetadataEdit: input.finishSelectedFormationMetadataEdit,
    saveCurrentFormationTemplate: input.saveCurrentFormationTemplate,
    addFormationFromSelectedTemplate: input.addFormationFromSelectedTemplate,
    selectTemplate: input.selectTemplate,
    updateFrontCautionZone: input.updateFrontCautionZone,
    updateSectionTiming: input.updateSectionTiming,
    undo: input.undoPlan
  };

  return {
    activeTab,
    actions,
    activeBottomSheet,
    actionBar,
    actionBarState,
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
