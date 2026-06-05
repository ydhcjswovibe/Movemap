import React, { useMemo, useRef, useState } from "react";
import StitchMobileEditor from "./StitchMobileEditor.jsx";

const performers = [
  { id: "p1", name: "Ari", color: "#2e62ff" },
  { id: "p2", name: "Bea", color: "#05e777" },
  { id: "p3", name: "Cal", color: "#d43237" },
  { id: "p4", name: "Dia", color: "#b7c4ff" }
];

const sections = [
  { id: "s1", name: "Intro V", arrivalTime: 0 },
  { id: "s2", name: "Cross Move", arrivalTime: 16 },
  { id: "s3", name: "Final Line", arrivalTime: 34 }
];

export default function StitchMobileEditorMock() {
  const [selectedPerformerId, setSelectedPerformerId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("s1");
  const [panelOpen, setPanelOpen] = useState(false);
  const svgRef = useRef(null);
  const timelineViewportRef = useRef(null);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0];
  const selectionVisualState = selectedPerformerId ? "token-selected" : selectedSectionId ? "formation-selected" : "idle";
  const model = useMemo(() => ({
    activeMobilePanelActionKey: panelOpen ? "people" : "",
    activeSection: selectedSection,
    activeSectionName: selectedSection.name,
    activeTransitionPaths: [{ context: "next", performerId: "p1", from: { x: 1, y: 1.5 }, to: { x: 4, y: 4.5 } }],
    arrivalLabel: "0:16.0",
    currentSectionId: selectedSection.id,
    dragPositions: null,
    focusedPerformerIds: selectedPerformerId ? [selectedPerformerId] : [],
    frontZone: { y: 4.2 },
    globalActions: [
      { key: "save", icon: "save", label: "저장" },
      { key: "share", icon: "share", label: "공유" },
      { key: "download", icon: "download", label: "다운로드" },
      { key: "more", icon: "more", label: "더보기" }
    ],
    hasUsableAudio: true,
    isMobilePanelOpen: panelOpen,
    isPlaying: false,
    localSaveLabel: "저장됨",
    mobileActions: [
      { key: "people", icon: "users", label: "사람" },
      { key: "stage", icon: "settings", label: "무대" },
      { key: "view", icon: "grid", label: "보기" }
    ],
    mobilePanelSize: "half",
    mobilePanelTitle: "사람",
    performers,
    playheadPixel: 80,
    projectTitle: "Movemap Pro Editor",
    readonly: false,
    redoDisabled: true,
    selectedPerformerId,
    selectedPerformerIds: selectedPerformerId ? [selectedPerformerId] : [],
    selectedSection,
    selectedSectionId,
    selectedStateText: selectedPerformerId ? "토큰 선택" : "대형 선택",
    selectionVisualState,
    snapPixel: null,
    sortedSections: sections,
    stage3dProjection: null,
    stageDimensions: { width: 5, height: 6 },
    stageReferences: [],
    stageSizeLabel: "5m x 6m",
    stageViewMode: "2d",
    timeLabel: "0:08.0",
    timelineContentWidth: 620,
    timelineFormationBlocks: sections.map((_, index) => ({
      leftPx: index * 176 + 8,
      logicalLeftPx: index * 176 + 8,
      widthPx: 152,
      hitWidthPx: 152,
      arrivalPx: index * 176 + 84
    })),
    timelineScrollX: 0,
    timelineTicks: [{ time: 0, x: 0, label: "0:00" }, { time: 15, x: 150, label: "0:15" }, { time: 30, x: 300, label: "0:30" }],
    timelineZoomLabel: "100%",
    topActionMenu: "",
    topActionSurface: "",
    transitionPathCount: 1,
    undoDisabled: true,
    visiblePositions: {
      p1: { x: 1, y: 1.5 },
      p2: { x: 2.2, y: 2.5 },
      p3: { x: 3.3, y: 2.4 },
      p4: { x: 4.1, y: 4.4 }
    },
    waveformBars: Array.from({ length: 32 }, (_, index) => 0.35 + (index % 5) * 0.12)
  }), [panelOpen, selectedPerformerId, selectedSection, selectedSectionId]);

  const actions = {
    addSection: () => {},
    clearDrag: () => {},
    clearTimelineSelection: () => {
      setSelectedPerformerId("");
      setSelectedSectionId("");
    },
    closeMobilePanel: () => setPanelOpen(false),
    closeTopActionMenu: () => {},
    cycleMobilePanelSize: () => {},
    finishActiveDrag: () => {},
    handleMobileAction: (key) => {
      if (key === "people") setPanelOpen(true);
    },
    handleStageTap: () => setSelectedPerformerId(""),
    onFormationPointerDown: (_event, section) => setSelectedSectionId(section.id),
    onStagePointerDown: (event, id) => {
      event.stopPropagation();
      setSelectedPerformerId(id);
      setPanelOpen(true);
    },
    onStagePointerMove: () => {},
    onTimelinePointerDown: () => {},
    onTimelinePointerMove: () => {},
    onTimelinePointerUp: () => {},
    onTimelineWheel: () => {},
    openAudioFilePicker: () => {},
    openTopActionMenu: () => {},
    redoPlan: () => {},
    renderDownloadMenu: () => <div className="top-action-menu download-action-menu"><button>현재 PNG</button></div>,
    renderMobilePanelContent: () => <div className="performer-grid">{performers.map((performer) => <button className={selectedPerformerId === performer.id ? "performer active" : "performer"} key={performer.id} onClick={() => setSelectedPerformerId(performer.id)}>{performer.name}</button>)}</div>,
    renderMoreMenu: () => <div className="top-action-menu more-action-menu"><button>프로젝트 선택으로 돌아가기</button></div>,
    renderShareMenu: () => <div className="top-action-menu share-action-menu"><button>편집 링크 만들기</button></div>,
    selectPerformer: setSelectedPerformerId,
    setStageViewMode: () => {},
    svgRef,
    timelineViewportRef,
    togglePlayback: () => {},
    toggleStageReferences: () => {},
    undoPlan: () => {},
    zoomTimelineBy: () => {}
  };

  return <StitchMobileEditor actions={actions} model={model} />;
}
