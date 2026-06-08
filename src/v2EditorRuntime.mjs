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

export function createV2EditorRuntime(input = {}) {
  const selectedSectionId = selectedSectionIdFor(input);
  const selectedSection = selectedSectionFor(input, selectedSectionId);
  const selectedPerformerId = input.selectedPerformerId || input.selection?.selectedPerformerId || "";
  const selectedPerformerIds = normalizeArray(input.selectedPerformerIds || input.selection?.selectedPerformerIds);
  const sortedSections = normalizeArray(input.sortedSections || input.timeline?.sortedSections);
  const readonly = Boolean(input.readonly || input.shell?.readonly);
  const stageDimensions = normalizeStageDimensions(input.stageDimensions || input.stage?.stageDimensions);
  const hasPerformerSelection = Boolean(selectedPerformerId || selectedPerformerIds.length);
  const canDuplicate = !readonly && (hasPerformerSelection || Boolean(selectedSection));
  const canDelete = !readonly && (hasPerformerSelection || Boolean(selectedSection && sortedSections.length > 1));

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
    waveformBars: normalizeArray(input.waveformBars || input.timeline?.waveformBars)
  };
  const capabilities = {
    canAddAudio: !readonly,
    canAddFormation: !readonly,
    canDelete,
    canDuplicate,
    canRedo: !readonly && !Boolean(input.redoDisabled ?? input.actions?.redoDisabled),
    canUndo: !readonly && !Boolean(input.undoDisabled ?? input.actions?.undoDisabled)
  };
  const actions = {
    addAudio: input.openAudioFilePicker,
    addFormation: input.addSection,
    delete: input.deleteSelection,
    duplicate: input.duplicateSelection,
    more: input.handleMobileAction,
    play: input.togglePlayback,
    redo: input.redoPlan,
    selectFormation: input.onFormationSelect,
    selectPerformer: input.selectPerformer,
    stagePointerDown: input.onV2StagePointerDown,
    stagePointerMove: input.onV2StagePointerMove,
    stagePointerUp: input.onV2StagePointerUp,
    stageTap: input.onV2StageTap,
    timelinePointerDown: input.onTimelinePointerDown,
    timelinePointerMove: input.onTimelinePointerMove,
    timelinePointerUp: input.onTimelinePointerUp,
    timelineWheel: input.onTimelineWheel,
    undo: input.undoPlan
  };

  return {
    actions,
    capabilities,
    sections: sortedSections,
    selection,
    shell,
    stage,
    timeline,
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
