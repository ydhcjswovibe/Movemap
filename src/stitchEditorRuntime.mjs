const PANEL_TITLES = {
  align: "정렬 방향",
  formation: "대형",
  people: "사람",
  performer: "선택",
  role: "역할 선택",
  stage: "무대",
  transition: "동선",
  view: "보기"
};

function formatPanelTime(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  const tenths = Math.round((value % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
}

function sectionArrival(section) {
  return Number(section?.arrivalTime ?? section?.time ?? section?.end ?? 0) || 0;
}

function sectionMoveDuration(section) {
  return Math.max(0, Number(section?.moveDuration ?? 0) || 0);
}

function performerRoleLabel(role) {
  if (role === "groupA") return "A 그룹";
  if (role === "groupB") return "B 그룹";
  return "기타";
}

function findSelectedPerformer(input) {
  return (input.performers || []).find((performer) => performer.id === input.selectedPerformerId) || null;
}

function buildInspectorPanels(input) {
  const selectedPerformer = findSelectedPerformer(input);
  const selectedSection = input.selectedSection || null;
  const readonly = Boolean(input.readonly);
  return {
    performer: {
      key: "performer",
      sections: [
        {
          key: "summary",
          items: [
            { label: "이름", value: selectedPerformer?.name || selectedPerformer?.label || "선택 없음" },
            { label: "그룹", value: performerRoleLabel(selectedPerformer?.role) },
            { label: "선택", value: input.selectedPerformerId ? "토큰 1명" : "없음" }
          ]
        }
      ],
      actions: readonly ? [] : [
        { key: "clear-selection", label: "선택 해제", command: "clear-selection", danger: true }
      ]
    },
    formation: {
      key: "formation",
      sections: [
        {
          key: "summary",
          items: [
            { label: "대형명", value: selectedSection?.name || "대형 없음" },
            { label: "도착 시각", value: selectedSection ? formatPanelTime(sectionArrival(selectedSection)) : "0:00.0" },
            { label: "이동 시간", value: selectedSection ? `${sectionMoveDuration(selectedSection)}초` : "0초" }
          ]
        }
      ],
      actions: readonly ? [] : [
        { key: "duplicate-formation", label: "복제", mobileActionKey: "duplicate-formation" },
        { key: "delete-formation", label: "삭제", mobileActionKey: "delete-formation", danger: true }
      ]
    },
    view: {
      key: "view",
      sections: [
        {
          key: "visibility",
          items: [
            { label: "보기 모드", value: input.stageViewMode === "3d" ? "3D" : "2D" },
            { label: "참조선", value: input.stageReferences?.length ? `${input.stageReferences.length}개` : "꺼짐" },
            { label: "동선", value: `${input.transitionPathCount || 0}개` }
          ]
        }
      ],
      actions: [
        { key: "toggle-transition-paths", label: "동선 보기", command: "toggle-transition-paths", icon: "path" },
        { key: "toggle-stage-references", label: "참조선", command: "toggle-stage-references", icon: "grid" },
        { key: "toggle-stage-reference-labels", label: "참조선 라벨", command: "toggle-stage-reference-labels", icon: "label" },
        ...(readonly ? [] : [{ key: "toggle-snap", label: "스냅", command: "toggle-snap", icon: "grid" }])
      ]
    },
    role: {
      key: "role",
      sections: [],
      actions: [
        { key: "role-group-a", label: "A 그룹", command: "role-group-a", icon: "label" },
        { key: "role-group-b", label: "B 그룹", command: "role-group-b", icon: "label" },
        { key: "role-other", label: "기타", command: "role-other", icon: "label" }
      ]
    },
    align: {
      key: "align",
      sections: [],
      actions: [
        { key: "align-x", label: "세로 정렬", command: "align-x", icon: "grid", disabled: (input.selectedPerformerIds || []).length < 2 },
        { key: "align-y", label: "가로 정렬", command: "align-y", icon: "grid", disabled: (input.selectedPerformerIds || []).length < 2 }
      ]
    },
    people: {
      key: "people",
      fallback: true,
      sections: [
        {
          key: "summary",
          items: [
            { label: "인원", value: `${(input.performers || []).length}명` },
            { label: "선택", value: input.selectedPerformerId || (input.selectedPerformerIds || []).length ? "있음" : "없음" }
          ]
        }
      ],
      actions: []
    },
    stage: {
      key: "stage",
      fallback: true,
      sections: [
        {
          key: "summary",
          items: [
            { label: "무대", value: input.stageSizeLabel || "" },
            { label: "보기", value: input.stageViewMode === "3d" ? "3D" : "2D" }
          ]
        }
      ],
      actions: []
    },
    transition: {
      key: "transition",
      fallback: true,
      sections: [
        {
          key: "summary",
          items: [
            { label: "동선", value: `${input.transitionPathCount || 0}개` }
          ]
        }
      ],
      actions: [{ key: "stage-3d", label: "3D preview", command: "stage-3d" }]
    }
  };
}

export function createStitchEditorRuntime(input = {}) {
  const shell = {
    activeSectionName: input.activeSection?.name || "대형 없음",
    arrivalLabel: input.arrivalLabel,
    localSaveLabel: input.localSaveLabel,
    projectTitle: input.projectTitle,
    readonly: input.readonly,
    timeLabel: input.timeLabel
  };
  const stage = {
    activeSection: input.activeSection,
    activeTransitionPaths: input.activeTransitionPaths,
    dragPositions: input.dragPositions,
    focusedPerformerIds: input.focusedPerformerIds,
    frontZone: input.frontZone,
    performers: input.performers,
    stage3dProjection: input.stage3dProjection,
    stageDimensions: input.stageDimensions,
    stageReferences: input.stageReferences,
    stageSizeLabel: input.stageSizeLabel,
    stageViewMode: input.stageViewMode,
    transitionPathCount: input.transitionPathCount,
    visiblePositions: input.visiblePositions
  };
  const timeline = {
    currentSectionId: input.currentSectionId,
    hasUsableAudio: input.hasUsableAudio,
    isPlaying: input.isPlaying,
    playheadPixel: input.playheadPixel,
    snapPixel: input.snapPixel,
    sortedSections: input.sortedSections,
    timelineBlockedEdge: input.timelineBlockedEdge,
    timelineContentWidth: input.timelineContentWidth,
    timelineFormationBlocks: input.timelineFormationBlocks,
    timelineScrollX: input.timelineScrollX,
    timelineTicks: input.timelineTicks,
    timelineVisualSegments: input.timelineVisualSegments,
    timelineZoomLabel: input.timelineZoomLabel,
    waveformBars: input.waveformBars
  };
  const selection = {
    selectedPerformerId: input.selectedPerformerId,
    selectedPerformerIds: input.selectedPerformerIds,
    selectedSection: input.selectedSection,
    selectedSectionId: input.selectedSectionId,
    selectedStateText: input.selectedStateText,
    selectionVisualState: input.selectionVisualState
  };
  const inspectorPanels = buildInspectorPanels(input);
  const panelKey = input.mobilePanelKind || input.activeMobilePanelActionKey || "";
  const currentPanel = inspectorPanels[panelKey] || null;
  const inspector = {
    activeMobilePanelActionKey: input.activeMobilePanelActionKey,
    currentPanel,
    isOpen: Boolean(input.isMobilePanelOpen),
    isMobilePanelOpen: input.isMobilePanelOpen,
    panelKey,
    panels: inspectorPanels,
    mobilePanelSize: input.mobilePanelSize,
    mobilePanelTitle: input.mobilePanelTitle || PANEL_TITLES[panelKey] || "도구",
    title: input.mobilePanelTitle || PANEL_TITLES[panelKey] || "도구"
  };
  const actionModel = {
    globalActions: input.globalActions,
    mobileActions: input.mobileActions,
    redoDisabled: input.redoDisabled,
    topActionMenu: input.topActionMenu,
    topActionSurface: input.topActionSurface,
    undoDisabled: input.undoDisabled
  };
  const model = {
    actions: actionModel,
    inspector,
    selection,
    shell,
    stage,
    timeline,
    activeMobilePanelActionKey: input.activeMobilePanelActionKey,
    activeSection: input.activeSection,
    activeSectionName: shell.activeSectionName,
    activeTransitionPaths: input.activeTransitionPaths,
    arrivalLabel: input.arrivalLabel,
    currentSectionId: input.currentSectionId,
    dragPositions: input.dragPositions,
    focusedPerformerIds: input.focusedPerformerIds,
    frontZone: input.frontZone,
    globalActions: input.globalActions,
    hasUsableAudio: input.hasUsableAudio,
    isMobilePanelOpen: input.isMobilePanelOpen,
    isPlaying: input.isPlaying,
    localSaveLabel: input.localSaveLabel,
    mobileActions: input.mobileActions,
    mobilePanelSize: input.mobilePanelSize,
    mobilePanelTitle: input.mobilePanelTitle,
    performers: input.performers,
    playheadPixel: input.playheadPixel,
    projectTitle: input.projectTitle,
    readonly: input.readonly,
    redoDisabled: input.redoDisabled,
    selectedPerformerId: input.selectedPerformerId,
    selectedPerformerIds: input.selectedPerformerIds,
    selectedSection: input.selectedSection,
    selectedSectionId: input.selectedSectionId,
    selectedStateText: input.selectedStateText,
    selectionVisualState: input.selectionVisualState,
    snapPixel: input.snapPixel,
    sortedSections: input.sortedSections,
    stage3dProjection: input.stage3dProjection,
    stageDimensions: input.stageDimensions,
    stageReferences: input.stageReferences,
    stageSizeLabel: input.stageSizeLabel,
    stageViewMode: input.stageViewMode,
    timeLabel: input.timeLabel,
    timelineBlockedEdge: input.timelineBlockedEdge,
    timelineContentWidth: input.timelineContentWidth,
    timelineFormationBlocks: input.timelineFormationBlocks,
    timelineScrollX: input.timelineScrollX,
    timelineTicks: input.timelineTicks,
    timelineVisualSegments: input.timelineVisualSegments,
    timelineZoomLabel: input.timelineZoomLabel,
    topActionMenu: input.topActionMenu,
    topActionSurface: input.topActionSurface,
    transitionPathCount: input.transitionPathCount,
    undoDisabled: input.undoDisabled,
    visiblePositions: input.visiblePositions,
    waveformBars: input.waveformBars
  };

  const actions = {
    addSection: input.addSection,
    clearDrag: input.clearDrag,
    clearTimelineSelection: input.clearTimelineSelection,
    closeMobilePanel: input.closeMobilePanel,
    closeTopActionMenu: input.closeTopActionMenu,
    cycleMobilePanelSize: input.cycleMobilePanelSize,
    finishActiveDrag: input.finishActiveDrag,
    handleMobileAction: input.handleMobileAction,
    handleInspectorAction: (descriptor) => {
      if (!descriptor || descriptor.disabled) return;
      if (descriptor.mobileActionKey) {
        input.handleMobileAction?.(descriptor.mobileActionKey);
        return;
      }
      if (descriptor.command) {
        input.inspectorCommands?.[descriptor.command]?.();
      }
    },
    handleStageTap: input.handleStageTap,
    onFormationPointerDown: input.onFormationPointerDown,
    onFormationSelect: input.onFormationSelect,
    onStagePointerDown: input.onStagePointerDown,
    onStagePointerMove: input.onStagePointerMove,
    onTimelinePointerDown: input.onTimelinePointerDown,
    onTimelinePointerMove: input.onTimelinePointerMove,
    onTimelinePointerUp: input.onTimelinePointerUp,
    onTimelineWheel: input.onTimelineWheel,
    openAudioFilePicker: input.openAudioFilePicker,
    openTopActionMenu: input.openTopActionMenu,
    redoPlan: input.redoPlan,
    renderDownloadMenu: input.renderDownloadMenu,
    renderMobilePanelContent: input.renderMobilePanelContent,
    renderMoreMenu: input.renderMoreMenu,
    renderShareMenu: input.renderShareMenu,
    selectPerformer: input.selectPerformer,
    setStageViewMode: input.setStageViewMode,
    svgRef: input.svgRef,
    timelineViewportRef: input.timelineViewportRef,
    togglePlayback: input.togglePlayback,
    toggleStageReferences: input.toggleStageReferences,
    undoPlan: input.undoPlan,
    zoomTimelineBy: input.zoomTimelineBy
  };

  return { actions, model };
}
