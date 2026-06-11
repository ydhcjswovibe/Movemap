import React, { useEffect, useMemo, useRef, useState } from "react";
import CoolIcon from "./icons/CoolIcon.jsx";
import { v2StageTokenPixelMetrics } from "./stageVisualMetrics.mjs";
import "./v2VisualEditor.css";

const demoPerformers = [
  { id: "A3", label: "A3", role: "groupA", color: "#256fe8", x: 20, y: 20 },
  { id: "A2", label: "A2", role: "groupA", color: "#256fe8", x: 60, y: 29 },
  { id: "A1", label: "A1", role: "groupA", color: "#256fe8", x: 30, y: 40 },
  { id: "A4", label: "A4", role: "groupA", color: "#256fe8", x: 72, y: 51 },
  { id: "B2", label: "B2", role: "groupB", color: "#d72f72", x: 24, y: 67 },
  { id: "B1", label: "B1", role: "groupB", color: "#d72f72", x: 39, y: 75 },
  { id: "B3", label: "B3", role: "groupB", color: "#d72f72", x: 55, y: 80 }
];

const demoTimelineSegments = [
  { kind: "hold", sectionId: "intro", label: "Intro V", leftPx: 0, widthPx: 93 },
  { kind: "move", sectionId: "diamond", label: "Move", leftPx: 112, widthPx: 44 },
  { kind: "hold", sectionId: "diamond", label: "Diamond Form", leftPx: 168, widthPx: 121 }
];

const demoWaveformSamples = [
  0.12, 0.2, 0.44, 0.62, 0.38, 0.27, 0.72, 0.54, 0.31, 0.18, 0.4, 0.66,
  0.83, 0.49, 0.3, 0.24, 0.58, 0.76, 0.5, 0.22, 0.16, 0.34, 0.59, 0.88,
  0.7, 0.42, 0.25, 0.19, 0.37, 0.57, 0.74, 0.52, 0.29, 0.21, 0.33, 0.47,
  0.63, 0.46, 0.28, 0.17, 0.22, 0.36, 0.51, 0.67, 0.43, 0.26, 0.18, 0.14
];

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function preciseTimeLabel(label = "00 : 01 : 14 .23") {
  const match = String(label).match(/(\d+):(\d{2})(?:\.(\d+))?/);
  if (!match) return label;
  const totalMinutes = Number(match[1]) || 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = match[2];
  const frames = String(match[3] || "0").padEnd(2, "0").slice(0, 2);
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${seconds} .${frames}`;
}

function performerLabel(performer) {
  const value = String(performer.name || performer.label || performer.id || "").trim();
  return Array.from(value.replace(/\s+/g, "")).slice(0, /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value) ? 2 : 3).join("") || performer.id;
}

function roleClass(performer) {
  return performer.role === "groupB" || performer.group === "groupB" || performer.group === "b" ? "b" : "a";
}

function normalizeSaveLabel(label) {
  const value = String(label || "").trim();
  if (!value) return "Saved";
  if (/저장|saved/i.test(value)) return "Saved";
  return value;
}

function timelineStyle(leftPx, widthPx) {
  const left = Math.max(0, Number(leftPx) || 0);
  const width = Math.max(8, Number(widthPx) || 0);
  return {
    "--segment-left": `${left}px`,
    "--segment-width": `${width}px`
  };
}

function segmentDurationLabel(segment) {
  const rawDuration = Number(segment?.durationSeconds ?? segment?.duration);
  if (!Number.isFinite(rawDuration)) return "";
  const duration = Math.max(0, rawDuration);
  return `${Number.isInteger(duration) ? duration.toFixed(0) : duration.toFixed(1)}s`;
}

function tickStyle(tick, index) {
  return {
    "--tick-left": `${Math.max(0, Number(tick.pixel ?? tick.x ?? index * 80) || 0)}px`
  };
}

const taskTabs = ["Stage", "Timeline", "Cast"];

function buildDemoViewModel(model) {
  if (!model?.shell || !model?.stage || !model?.selection || !model?.timeline) {
    return {
      shell: {
        projectTitle: "Finale Scene",
        localSaveLabel: "Saved",
        readonly: false,
        timeLabel: "00 : 01 : 14 .23"
      },
      stage: {
        performers: demoPerformers,
        visiblePositions: Object.fromEntries(demoPerformers.map((performer) => [performer.id, { x: performer.x, y: performer.y }])),
        stageDimensions: { width: 100, height: 100 },
        frontZone: { y: 69 },
        grid: { columns: 100, rows: 100, centerXPercent: 50, centerYPercent: 50 },
        audienceGuideYPercent: 69,
        referenceGuides: [],
        referenceLabelsVisible: false,
        referencesVisible: false
      },
      stageInfoLine: {
        visible: true,
        leftLabel: "Diamond Form",
        rightLabel: "Snap on · 100x100 · 1m grid"
      },
      bottomRail: [
        { key: "stage", icon: "settings", label: "Stage", mode: "Stage", active: true },
        { key: "timeline", icon: "grid", label: "Timeline", mode: "Timeline" },
        { key: "cast", icon: "users", label: "Cast", mode: "Cast" }
      ],
      cast: {
        performers: demoPerformers.map((performer) => ({ ...performer, active: performer.id === "A1" })),
        selectedPerformerId: "A1",
        selectedPerformerIds: ["A1"],
        selectedSummary: {
          id: "A1",
          label: "A1",
          metaLabel: "groupA",
          stateLabel: "선택됨"
        },
        canClearSelection: true,
        canOpenRoleActions: true,
        canDuplicate: true,
        canDelete: true
      },
      selection: {
        selectedPerformerId: "A1",
        selectedPerformerIds: ["A1"],
        selectedSectionId: "diamond"
      },
      timeline: {
        currentSectionId: "diamond",
        playheadPixel: 180,
        timelineContentWidth: 320,
        timelineTicks: ["0:00", "0:01", "0:02", "0:03"].map((label, index) => ({ label, pixel: index * 100 })),
        timelineVisualSegments: demoTimelineSegments,
        waveformBars: demoWaveformSamples
      },
      moreMenu: [
        { key: "settings", label: "Settings", hasSubmenu: true },
        { key: "project-info", label: "Finale Scene" },
        { key: "help", label: "Help / Shortcuts", disabled: true }
      ],
      exportMenu: [
        { key: "export-json", label: "프로젝트 JSON 내보내기", scopeLabel: "Project backup", availabilityLabel: "Recovery file" },
        { key: "export-png", label: "현재 PNG", scopeLabel: "Current view", availabilityLabel: "플랜 업그레이드 필요", disabled: true },
        { key: "export-all-png", label: "전체 대형 PNG", scopeLabel: "All formations", availabilityLabel: "플랜 업그레이드 필요", disabled: true },
        { key: "print", label: "인쇄/PDF", scopeLabel: "Print layout", availabilityLabel: "플랜 업그레이드 필요", disabled: true }
      ],
      settingsMenu: [
        { key: "toggle-snap", label: "Snap", checked: true },
        { key: "toggle-stage-references", label: "Stage references", checked: false },
        { key: "toggle-stage-reference-labels", label: "Reference labels", checked: false },
        { key: "front-caution-zone", label: "앞쪽 주의 구역", kind: "meter", value: 69, min: 0, max: 100, step: 1, stateLabel: "69m" },
        { key: "toggle-transition-paths", label: "Transition paths", checked: false }
      ],
      stageTask: {
        settings: [
          { key: "toggle-snap", label: "Snap", checked: true, stateLabel: "On" },
          { key: "toggle-stage-references", label: "Stage references", checked: false, stateLabel: "Off" },
          { key: "toggle-stage-reference-labels", label: "Reference labels", checked: false, stateLabel: "Off" },
          { key: "toggle-transition-paths", label: "Transition paths", checked: false, stateLabel: "Off" }
        ],
        selectedPerformerSummary: {
          id: "A1",
          label: "A1",
          metaLabel: "groupA",
          stateLabel: "선택됨"
        },
        canClearSelection: true,
        canOpenRoleActions: true
      },
      timelineTask: {
        selectedFormationSummary: {
          id: "diamond",
          name: "Diamond Form",
          timeRangeLabel: "1.0s - 3.0s",
          durationLabel: "2.0s",
          trimStateLabel: "Trim enabled"
        },
        canTrimSelectedFormation: true,
        canAddFormation: true,
        canAddAudio: true,
        focusLabel: "Selected: Diamond Form"
      },
      share: {
        readonly: false,
        shareUrl: "",
        editShareUrl: "",
        viewLinkState: "없음",
        editLinkState: "없음",
        canCreateViewLink: true,
        canManageLinks: false
      },
      activeTab: "Stage",
      sections: [
        { id: "intro", name: "Intro V" },
        { id: "diamond", name: "Diamond Form" }
      ]
    };
  }

  return {
    shell: model.shell,
    stage: model.stage,
    selection: model.selection,
    timeline: model.timeline,
    capabilities: model.capabilities || {},
    actions: model.actions || {},
    activeTab: model.activeTab || "Stage",
    bottomRail: model.bottomRail || [],
    cast: model.cast || {},
    exportMenu: model.exportMenu || [],
    moreMenu: model.moreMenu || [],
    settingsMenu: model.settingsMenu || [],
    stageTask: model.stageTask || {},
    stageInfoLine: model.stageInfoLine || {},
    timelineTask: model.timelineTask || {},
    share: model.share || {},
    sections: model.timeline.sortedSections || model.sortedSections || model.sections || []
  };
}

function IconButton({ icon, label, className = "", primary = false, active = false, onClick, disabled = false, children = null }) {
  return (
    <button
      className={`v2-icon-button ${primary ? "is-primary" : ""} ${active ? "is-active" : ""} ${className}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children || <CoolIcon name={icon} />}
    </button>
  );
}

function V2VisualEditor({ model, actions = {} }) {
  const topbarRef = useRef(null);
  const stageSurfaceRef = useRef(null);
  const timelineTouchRef = useRef(null);
  const tokenGestureRef = useRef(null);
  const settingsHoverTimerRef = useRef(null);
  const suppressNextTokenClickRef = useRef(false);
  const [openTopMenu, setOpenTopMenu] = useState("");
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  const [stagePixelSize, setStagePixelSize] = useState({ width: 0, height: 0 });
  const view = buildDemoViewModel(model);
  const { shell, stage, stageInfoLine, selection, timeline, sections, share } = view;
  const runtimeActions = { ...(view.actions || {}), ...actions };
  const capabilities = view.capabilities || {};
  const activeTab = taskTabs.includes(view.activeTab) ? view.activeTab : "Stage";
  const stageDimensions = stage.stageDimensions || { width: 100, height: 100 };
  const stageWidth = Math.max(1, Number(stageDimensions.width) || 100);
  const stageHeight = Math.max(1, Number(stageDimensions.height) || 100);
  const stageGrid = stage.grid || {
    columns: Math.max(1, Math.round(stageWidth)),
    rows: Math.max(1, Math.round(stageHeight)),
    centerXPercent: 50,
    centerYPercent: 50
  };
  const stageGuideRows = Math.max(1, Number(stageGrid.rows) || 1);
  const stageGuideColumns = Math.max(1, Number(stageGrid.columns) || 1);
  const cautionGuideY = clampPercent(Number(stage.cautionZone?.yPercent ?? stage.audienceGuideYPercent) || ((stage.frontZone?.y ?? stageHeight * 0.69) / stageHeight) * 100);
  const tokenPixelMetrics = useMemo(() => v2StageTokenPixelMetrics({
    widthPx: stagePixelSize.width,
    heightPx: stagePixelSize.height,
    columns: stageGuideColumns,
    rows: stageGuideRows
  }), [stagePixelSize.height, stagePixelSize.width, stageGuideColumns, stageGuideRows]);
  const stageSurfaceStyle = {
    "--v2-stage-cols": stageGuideColumns,
    "--v2-stage-rows": stageGuideRows,
    "--v2-caution-y": `${cautionGuideY}%`,
    "--v2-stage-aspect": `${stageWidth} / ${stageHeight}`,
    "--v2-token-size": `${tokenPixelMetrics.tokenSizePx}px`,
    "--v2-token-label-size": `${tokenPixelMetrics.labelFontSizePx}px`,
    "--v2-token-hit-size": `${tokenPixelMetrics.hitSizePx}px`,
    "--v2-token-selected-spread": `${tokenPixelMetrics.selectedRingSpreadPx}px`
  };
  const selectedPerformerIds = new Set(selection.selectedPerformerIds || []);
  const selectedSectionId = selection.selectedSectionId || selection.selectedSection?.id || "";
  const currentSectionId = timeline.currentSectionId || "";
  const timelineContentWidth = Math.max(320, Number(timeline.timelineContentWidth ?? timeline.contentWidth) || 320);
  const timelineScrollX = Math.max(0, Number(timeline.timelineScrollX ?? timeline.scrollX) || 0);
  const rawPlayheadLeft = Number(timeline.playheadPixel);
  const playheadLeft = Number.isFinite(rawPlayheadLeft) ? rawPlayheadLeft : 0;
  const visualSegments = (timeline.holdMoveSegments?.length ? timeline.holdMoveSegments : timeline.timelineVisualSegments)?.length ? (timeline.holdMoveSegments?.length ? timeline.holdMoveSegments : timeline.timelineVisualSegments) : demoTimelineSegments;
  const waveformSamples = timeline.waveformBars?.length ? timeline.waveformBars.slice(0, 96) : demoWaveformSamples;
  const timelineContentStyle = {
    width: `${timelineContentWidth}px`,
    transform: `translateX(${-timelineScrollX}px)`
  };
  const blockDragPreview = timeline.timelineBlockDragPreview || null;
  const blockDragPreviewAction = blockDragPreview?.dropAction || "";
  const blockDragSourceRect = blockDragPreview?.sourceRect || {};
  const floatingBlockWidth = Math.max(56, Math.min(180, Number(blockDragSourceRect.width || blockDragPreview?.dropWidthPx) || 76));
  const floatingBlockHeight = Math.max(28, Math.min(74, Number(blockDragSourceRect.height) || 42));
  const floatingBlockStyle = blockDragPreview ? {
    width: `${floatingBlockWidth}px`,
    minHeight: `${floatingBlockHeight}px`,
    transform: `translate3d(${Math.round((Number(blockDragPreview.pointerClientX) || 0) - floatingBlockWidth / 2)}px, ${Math.round((Number(blockDragPreview.pointerClientY) || 0) - floatingBlockHeight / 2)}px, 0)`
  } : null;
  const dropPreviewStyle = blockDragPreview ? {
    "--drop-left": `${Math.max(0, Number(blockDragPreview.dropLeftPx) || 0)}px`,
    "--drop-width": `${Math.max(48, Number(blockDragPreview.dropWidthPx) || floatingBlockWidth)}px`
  } : null;
  const setTimelineViewportNode = (node) => {
    if (model?.timelineViewportRef) model.timelineViewportRef.current = node;
    if (node) runtimeActions.timelineViewportMeasured?.(node.getBoundingClientRect().width || 0);
  };
  const referenceLabelStyle = (reference) => {
    if (reference.id === "center-line") {
      return {
        "--guide-label-x": "50%",
        "--guide-label-y": "0%"
      };
    }
    const lineMidX = ((Number(reference.x1Percent) || 0) + (Number(reference.x2Percent) || 0)) / 2;
    const horizontalLine = reference.type !== "point" && Math.abs((Number(reference.y1Percent) || 0) - (Number(reference.y2Percent) || 0)) < 0.1;
    const left = reference.type === "point"
      ? reference.xPercent
      : horizontalLine && reference.tone === "front"
        ? Math.max(16, Math.min(84, (Number(reference.x1Percent) || 0) + 22))
        : lineMidX;
    const top = reference.type === "point"
      ? reference.yPercent
      : ((Number(reference.y1Percent) || 0) + (Number(reference.y2Percent) || 0)) / 2;
    return {
      "--guide-label-x": `${clampPercent(left)}%`,
      "--guide-label-y": `${clampPercent(top)}%`
    };
  };
  const touchAsPointerEvent = (event, touch, type) => ({
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    clientX: touch.clientX,
    clientY: touch.clientY,
    currentTarget: event.currentTarget,
    isPrimary: true,
    pointerId: touch.identifier + 1000,
    pointerType: "touch",
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
    type
  });
  const handleTimelineTouchStart = (event, source = { kind: "surface" }) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    timelineTouchRef.current = { identifier: touch.identifier, source };
    runtimeActions.timelinePointerDown?.(touchAsPointerEvent(event, touch, "pointerdown"), source);
  };
  const handlePlayheadPointerDown = (event) => {
    event.stopPropagation();
    runtimeActions.timelinePointerDown?.(event, { kind: "playhead" });
  };
  const handleTimelineTouchMove = (event) => {
    const activeTouch = timelineTouchRef.current;
    if (!activeTouch) return;
    const touch = Array.from(event.changedTouches || []).find((item) => item.identifier === activeTouch.identifier)
      || Array.from(event.touches || []).find((item) => item.identifier === activeTouch.identifier);
    if (!touch) return;
    runtimeActions.timelinePointerMove?.(touchAsPointerEvent(event, touch, "pointermove"));
  };
  const handleTimelineTouchEnd = (event) => {
    const activeTouch = timelineTouchRef.current;
    if (!activeTouch) return;
    const touch = Array.from(event.changedTouches || []).find((item) => item.identifier === activeTouch.identifier);
    if (!touch) return;
    const type = event.type === "touchcancel" ? "pointercancel" : "pointerup";
    runtimeActions.timelinePointerUp?.(touchAsPointerEvent(event, touch, type));
    timelineTouchRef.current = null;
  };
  const closeTopMenus = () => {
    if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
    settingsHoverTimerRef.current = null;
    setOpenTopMenu("");
    setSettingsSubmenuOpen(false);
  };
  const runMenuAction = (key) => {
    if (key === "export-json") {
      runtimeActions.exportJson?.();
      closeTopMenus();
    } else if (key === "export-png") {
      runtimeActions.exportPng?.();
      closeTopMenus();
    } else if (key === "export-all-png") {
      runtimeActions.exportAllPng?.();
      closeTopMenus();
    } else if (key === "print") {
      if (runtimeActions.print) runtimeActions.print();
      else if (typeof window !== "undefined") window.print();
      closeTopMenus();
    }
  };
  const runSettingsAction = (key) => {
    if (key === "toggle-snap") runtimeActions.toggleSnap?.();
    if (key === "toggle-stage-references") runtimeActions.toggleStageReferences?.();
    if (key === "toggle-stage-reference-labels") runtimeActions.toggleStageReferenceLabels?.();
    if (key === "toggle-transition-paths") runtimeActions.toggleTransitionPaths?.();
  };
  const updateCautionSetting = (setting, value) => {
    const min = Number(setting.min) || 0;
    const max = Math.max(min, Number(setting.max) || stageHeight);
    const step = Math.max(0.1, Number(setting.step) || 1);
    const snapped = Math.round((Math.max(min, Math.min(max, Number(value) || min)) - min) / step) * step + min;
    runtimeActions.updateFrontCautionZone?.(Number(snapped.toFixed(2)));
  };
  const runBottomAction = (action) => {
    if (!action || action.disabled) return;
    if (action.mode) {
      runtimeActions.setActiveTab?.(action.mode);
      return;
    }
    if (action.key === "duplicate-formation" || action.key === "duplicate-performer") runtimeActions.duplicate?.();
    else if (action.key === "delete-formation" || action.key === "delete-performer" || action.key === "delete-performers") runtimeActions.delete?.();
    else if (action.key === "clear-selection") runtimeActions.mobileAction?.("clear-selection");
    else runtimeActions.mobileAction?.(action.key);
  };

  useEffect(() => {
    function handlePointerDown(event) {
      if (!topbarRef.current?.contains(event.target)) closeTopMenus();
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") closeTopMenus();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const node = stageSurfaceRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const updateStagePixelSize = () => {
      const rect = node.getBoundingClientRect();
      setStagePixelSize((current) => {
        const width = Math.round(rect.width * 10) / 10;
        const height = Math.round(rect.height * 10) / 10;
        if (current.width === width && current.height === height) return current;
        return { width, height };
      });
    };
    updateStagePixelSize();
    const observer = new ResizeObserver(updateStagePixelSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="v2-visual-editor" data-v2-visual-editor>
      <section className="v2-phone-shell" aria-label="Movemap Pro Editor">
        <header className="v2-topbar" ref={topbarRef}>
          <div className="v2-title-cluster">
            <h1>{shell.projectTitle || shell.title || "Movemap"}</h1>
            <span className="v2-saved-chip">
              <span aria-hidden="true" />
              {normalizeSaveLabel(shell.localSaveLabel ?? shell.saveLabel)}
            </span>
          </div>
          <div className="v2-top-actions">
            <div className="v2-menu-anchor">
              <IconButton
                icon="share"
                label="공유"
                active={openTopMenu === "share"}
                onClick={() => {
                  setSettingsSubmenuOpen(false);
                  setOpenTopMenu((value) => value === "share" ? "" : "share");
                }}
              />
              {openTopMenu === "share" && (
                <div className="v2-top-menu v2-share-menu" role="menu" aria-label="공유 메뉴">
                  <div className="v2-menu-status-row">
                    <span>View {share.viewLinkState || (share.shareUrl ? "켜짐" : "없음")}</span>
                    {!share.readonly && <span>Edit {share.editLinkState || (share.editShareUrl ? "켜짐" : "없음")}</span>}
                  </div>
                  {!share.readonly && (
                    <button type="button" className="v2-menu-primary" onClick={() => runtimeActions.createShare?.()} disabled={share.isPending || (!share.canCreateViewLink && !share.shareUrl)}>
                      편집 링크 만들기
                    </button>
                  )}
                  <div className="v2-menu-link-row">
                    <span>보기 링크</span>
                    {share.shareUrl ? <a href={share.shareUrl}>열기</a> : <em>저장 후 생성</em>}
                    {share.shareUrl && <button type="button" onClick={() => runtimeActions.copyShareUrl?.()}>복사</button>}
                    {share.canManageLinks && share.shareUrl && (
                      <button type="button" onClick={() => runtimeActions.setShareLinkEnabled?.("view", share.viewLinkEnabled === false)}>
                        {share.viewLinkEnabled === false ? "켜기" : "끄기"}
                      </button>
                    )}
                  </div>
                  {!share.readonly && (
                    <div className="v2-menu-link-row">
                      <span>편집 링크</span>
                      {share.editShareUrl ? <a href={share.editShareUrl}>열기</a> : <em>생성 대기</em>}
                      {share.editShareUrl && <button type="button" onClick={() => runtimeActions.copyEditShareUrl?.()}>복사</button>}
                      {share.canManageLinks && share.editShareUrl && (
                        <button type="button" onClick={() => runtimeActions.setShareLinkEnabled?.("edit", share.editLinkEnabled === false)}>
                          {share.editLinkEnabled === false ? "켜기" : "끄기"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="v2-menu-anchor">
              <IconButton
                icon="download"
                label="내보내기"
                active={openTopMenu === "export"}
                onClick={() => {
                  setSettingsSubmenuOpen(false);
                  setOpenTopMenu((value) => value === "export" ? "" : "export");
                }}
              />
              {openTopMenu === "export" && (
                <div className="v2-top-menu v2-export-menu" role="menu" aria-label="내보내기 메뉴">
                  <div className="v2-export-scope-list" aria-label="내보내기 범위">
                    {(view.exportMenu || []).map((item) => (
                      <button
                        type="button"
                        key={`${item.key}-scope`}
                        className={item.disabled ? "is-disabled" : ""}
                        disabled={Boolean(item.disabled)}
                        onClick={() => runMenuAction(item.key)}
                      >
                        <strong>{item.scopeLabel}</strong>
                        <em>{item.availabilityLabel}</em>
                      </button>
                    ))}
                  </div>
                  {(view.exportMenu || []).map((item) => (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={Boolean(item.disabled)}
                      key={item.key}
                      onClick={() => runMenuAction(item.key)}
                    >
                      <span>{item.label}</span>
                      {item.scopeLabel && <em>{item.scopeLabel}</em>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="v2-menu-anchor">
              <IconButton
                icon="more"
                label="더보기"
                active={openTopMenu === "more"}
                onClick={() => {
                  const isOpening = openTopMenu !== "more";
                  setOpenTopMenu(isOpening ? "more" : "");
                  setSettingsSubmenuOpen(false);
                }}
              />
              {openTopMenu === "more" && (
                <div className="v2-top-menu v2-more-menu" role="menu" aria-label="더보기 메뉴">
                  {(view.moreMenu || []).map((item) => (
                    <div
                      className="v2-menu-item-wrap"
                      key={item.key}
                      onMouseEnter={() => {
                        if (item.key !== "settings") return;
                        if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
                        settingsHoverTimerRef.current = window.setTimeout(() => {
                          setSettingsSubmenuOpen(true);
                          settingsHoverTimerRef.current = null;
                        }, 160);
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={item.hasSubmenu ? "has-submenu" : ""}
                        disabled={Boolean(item.disabled)}
                        onClick={(event) => {
                          if (item.key === "settings") {
                            event.stopPropagation();
                            if (settingsHoverTimerRef.current) window.clearTimeout(settingsHoverTimerRef.current);
                            settingsHoverTimerRef.current = null;
                            setSettingsSubmenuOpen((value) => !value);
                          } else {
                            runMenuAction(item.key);
                          }
                        }}
                      >
                        <span>{item.label}</span>
                        {item.hasSubmenu && <span aria-hidden="true">{settingsSubmenuOpen ? "‹" : "›"}</span>}
                      </button>
                      {item.key === "settings" && settingsSubmenuOpen && (
                        <div className="v2-top-menu v2-settings-submenu" role="menu" aria-label="Settings 메뉴">
                          {(view.settingsMenu || []).map((setting) => setting.kind === "meter" ? (
                            <div
                              className="v2-settings-meter"
                              data-v2-caution-setting={setting.key === "front-caution-zone" ? "" : undefined}
                              key={setting.key}
                              role="group"
                              aria-label={setting.label}
                              aria-disabled={Boolean(setting.disabled)}
                            >
                              <span>{setting.label}</span>
                              <button
                                type="button"
                                aria-label={`${setting.label} 줄이기`}
                                disabled={Boolean(setting.disabled)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCautionSetting(setting, Number(setting.value) - (Number(setting.step) || 1));
                                }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={setting.min}
                                max={setting.max}
                                step={setting.step}
                                value={setting.value}
                                disabled={Boolean(setting.disabled)}
                                aria-label={setting.label}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => updateCautionSetting(setting, event.target.value)}
                              />
                              <button
                                type="button"
                                aria-label={`${setting.label} 늘리기`}
                                disabled={Boolean(setting.disabled)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCautionSetting(setting, Number(setting.value) + (Number(setting.step) || 1));
                                }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              role="menuitemcheckbox"
                              aria-checked={Boolean(setting.checked)}
                              disabled={Boolean(setting.disabled)}
                              key={setting.key}
                              onClick={(event) => {
                                event.stopPropagation();
                                runSettingsAction(setting.key);
                              }}
                            >
                              <span>{setting.label}</span>
                              <span aria-hidden="true">{setting.checked ? "On" : "Off"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="v2-stage-wrap" data-v2-stage aria-label="Stage">
          {stageInfoLine?.visible !== false && (
            <div className="v2-stage-info-line" data-v2-stage-info-line>
              <span>{stageInfoLine?.leftLabel || "No formation"}</span>
              <span>{stageInfoLine?.rightLabel || "Snap on · 12x8 · 1m grid"}</span>
            </div>
          )}
          <div
            className="v2-stage-surface"
            ref={stageSurfaceRef}
            style={stageSurfaceStyle}
            onPointerMove={(event) => {
              const gesture = tokenGestureRef.current;
              if (gesture?.pointerId === event.pointerId && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 3) {
                gesture.moved = true;
              }
              runtimeActions.stagePointerMove?.(event, stageSurfaceRef.current);
            }}
            onPointerUp={(event) => {
              const gesture = tokenGestureRef.current;
              if (gesture?.pointerId === event.pointerId) {
                suppressNextTokenClickRef.current = Boolean(gesture.moved);
                tokenGestureRef.current = null;
              }
              runtimeActions.stagePointerUp?.(event);
            }}
            onPointerCancel={(event) => {
              tokenGestureRef.current = null;
              runtimeActions.stagePointerUp?.(event);
            }}
            onClick={(event) => runtimeActions.stageTap?.(event, stageSurfaceRef.current)}
          >
            <div className="v2-stage-grid" data-v2-stage-grid aria-hidden="true" />
            {stage.referencesVisible && (
              <div className="v2-stage-guide-layer" data-v2-stage-guides aria-hidden="true">
                <svg className="v2-stage-reference-svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                  {(stage.referenceGuides || []).map((reference) => reference.type === "point" ? (
                    <circle
                      key={reference.id}
                      className={`v2-stage-guide-point v2-stage-guide-${reference.tone || "neutral"}`}
                      cx={clampPercent(reference.xPercent)}
                      cy={clampPercent(reference.yPercent)}
                      r="1.1"
                    />
                  ) : (
                    <line
                      key={reference.id}
                      className={`v2-stage-guide-line v2-stage-guide-${reference.tone || "neutral"}`}
                      x1={clampPercent(reference.x1Percent)}
                      y1={clampPercent(reference.y1Percent)}
                      x2={clampPercent(reference.x2Percent)}
                      y2={clampPercent(reference.y2Percent)}
                    />
                  ))}
                </svg>
                {stage.referenceLabelsVisible && (stage.referenceGuides || [])
                  .filter((reference) => reference.id !== "front-line")
                  .map((reference) => (
                  <span
                    key={`${reference.id}-label`}
                    className={`v2-stage-guide-label v2-stage-guide-label-${reference.tone || "neutral"} ${reference.id === "center-line" ? "v2-stage-guide-label-center" : ""}`}
                    style={referenceLabelStyle(reference)}
                  >
                    {reference.label}
                  </span>
                ))}
              </div>
            )}
            {activeTab === "Cast" && (
              <div className="v2-cast-task-surface" data-v2-tab-surface="Cast" aria-label="Cast roster">
                <div className="v2-task-summary">
                  <span>{view.cast?.selectedSummary?.label || "No performer"}</span>
                  <strong>{view.cast?.selectedSummary?.stateLabel || "선택 없음"}</strong>
                  <em>{view.cast?.selectedSummary?.metaLabel || "No role"}</em>
                </div>
                <div className="v2-cast-roster">
                  {(view.cast?.performers?.length ? view.cast.performers : stage.performers || []).map((performer) => {
                    const active = Boolean(performer.active || selection.selectedPerformerId === performer.id || selectedPerformerIds.has(performer.id));
                    return (
                      <button
                        key={performer.id}
                        type="button"
                        className={active ? "is-active" : ""}
                        aria-pressed={active}
                        data-v2-cast-performer={performer.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          runtimeActions.selectPerformer?.(performer.id);
                        }}
                      >
                        <span>{performerLabel(performer)}</span>
                        <em>{performer.role === "groupB" ? "B" : "A"}</em>
                      </button>
                    );
                  })}
                </div>
                <div className="v2-cast-actions">
                  <button
                    type="button"
                    disabled={!view.cast?.canDuplicate}
                    onClick={(event) => {
                      event.stopPropagation();
                      runtimeActions.duplicate?.();
                    }}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    disabled={!view.cast?.canDelete}
                    onClick={(event) => {
                      event.stopPropagation();
                      runtimeActions.delete?.();
                    }}
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    disabled={!view.cast?.canClearSelection}
                    onClick={(event) => {
                      event.stopPropagation();
                      runtimeActions.mobileAction?.("clear-selection");
                    }}
                  >
                    해제
                  </button>
                  <button
                    type="button"
                    disabled={!view.cast?.canOpenRoleActions}
                    onClick={(event) => {
                      event.stopPropagation();
                      runtimeActions.mobileAction?.("performer-role");
                    }}
                  >
                    역할
                  </button>
                </div>
              </div>
            )}
            <div className="v2-caution-zone" data-v2-caution-zone aria-hidden="true" />

            {(stage.performers || []).map((performer) => {
              const position = stage.dragPositions?.[performer.id] || stage.visiblePositions?.[performer.id] || performer;
              const x = clampPercent((Number(position.x) / stageWidth) * 100);
              const y = clampPercent((Number(position.y) / stageHeight) * 100);
              const selected = selection.selectedPerformerId === performer.id || selectedPerformerIds.has(performer.id);
              return (
                <button
                  key={performer.id}
                  className={`v2-token v2-token-${roleClass(performer)} ${selected ? "is-selected" : ""}`}
                  data-v2-performer-token={performer.id}
                  style={{
                    "--token-x": `${x}%`,
                    "--token-y": `${y}%`,
                    "--token-color": performer.color || undefined
                  }}
                  type="button"
                  aria-label={`${performerLabel(performer)} performer`}
                  aria-pressed={selected}
                  onPointerDown={(event) => {
                    tokenGestureRef.current = {
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      moved: false
                    };
                    runtimeActions.stagePointerDown?.(event, performer.id, stageSurfaceRef.current);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressNextTokenClickRef.current) {
                      suppressNextTokenClickRef.current = false;
                      return;
                    }
                    runtimeActions.selectPerformer?.(performer.id);
                  }}
                >
                  {performerLabel(performer)}
                </button>
              );
            })}
          </div>
          <div className="v2-audience-strip" aria-hidden="true">
            <svg
              className={`v2-audience-guide ${stage.referenceLabelsVisible ? "" : "is-label-hidden"}`}
              data-v2-audience-guide
              viewBox="0 0 220 28"
              preserveAspectRatio="xMidYMid meet"
              focusable="false"
            >
              <g className="v2-audience-people">
                <circle cx="74" cy="16" r="4" />
                <circle cx="94" cy="13" r="4" />
                <circle cx="114" cy="15" r="4" />
                <circle cx="134" cy="13" r="4" />
                <circle cx="154" cy="16" r="4" />
                <rect x="69" y="21" width="10" height="5" rx="2.5" />
                <rect x="89" y="18" width="10" height="5" rx="2.5" />
                <rect x="109" y="20" width="10" height="5" rx="2.5" />
                <rect x="129" y="18" width="10" height="5" rx="2.5" />
                <rect x="149" y="21" width="10" height="5" rx="2.5" />
              </g>
            </svg>
          </div>
        </section>

        <section className="v2-transport" aria-label="Playback controls">
          <IconButton icon={timeline.isPlaying ? "pause" : "play"} label={timeline.isPlaying ? "정지" : "재생"} className="v2-play-button" onClick={runtimeActions.play} />
          <div className="v2-timecode" aria-label="Current timecode">{preciseTimeLabel(shell.timeLabel)}</div>
          <div className="v2-transport-spacer" aria-hidden="true" />
          <IconButton icon="undo" label="실행 취소" disabled={!capabilities.canUndo} onClick={runtimeActions.undo} />
          <IconButton icon="redo" label="다시 실행" disabled={!capabilities.canRedo} onClick={runtimeActions.redo} />
        </section>

        <section className="v2-timeline" data-v2-timeline aria-label="Formation timeline" onWheel={runtimeActions.timelineWheel}>
          {activeTab === "Timeline" && (
            <div className="v2-timeline-task-surface" data-v2-tab-surface="Timeline" aria-label="Timeline task controls">
              <div className="v2-task-summary">
                <span>{view.timelineTask?.focusLabel || "No selected block"}</span>
                <strong>{view.timelineTask?.selectedFormationSummary?.name || selection.selectedSection?.name || sections.find((section) => section.id === selectedSectionId)?.name || "Timeline"}</strong>
                <em>{view.timelineTask?.selectedFormationSummary?.timeRangeLabel || "Select a block"}</em>
              </div>
              <div className="v2-timeline-selection-meta">
                <span>{view.timelineTask?.selectedFormationSummary?.durationLabel || "0.0s"}</span>
                <span>{view.timelineTask?.selectedFormationSummary?.trimStateLabel || "Select to trim"}</span>
              </div>
              <div className="v2-task-actions">
                <button type="button" disabled={!view.timelineTask?.canAddFormation} onClick={() => runtimeActions.addFormation?.({ forceAppend: true })}>대형 추가</button>
                <button type="button" disabled={!view.timelineTask?.canAddAudio} onClick={runtimeActions.addAudio}>음악 추가</button>
              </div>
            </div>
          )}
          <div className="v2-ruler">
            <div className="v2-timeline-tools" aria-label="Timeline zoom controls">
              <IconButton icon="zoom-minus" label="타임라인 축소" className="v2-timeline-zoom-button" onClick={() => runtimeActions.zoomTimelineBy?.(0.88)}>-</IconButton>
              <IconButton icon="add" label="타임라인 확대" className="v2-timeline-zoom-button" onClick={() => runtimeActions.zoomTimelineBy?.(1.14)}>+</IconButton>
            </div>
            <div
              className="v2-timeline-viewport"
              onPointerDown={(event) => runtimeActions.timelinePointerDown?.(event, { kind: "ruler" })}
              onPointerMove={runtimeActions.timelinePointerMove}
              onPointerUp={runtimeActions.timelinePointerUp}
              onPointerCancel={runtimeActions.timelinePointerUp}
              onTouchStart={(event) => handleTimelineTouchStart(event, { kind: "ruler" })}
              onTouchMove={handleTimelineTouchMove}
              onTouchEnd={handleTimelineTouchEnd}
              onTouchCancel={handleTimelineTouchEnd}
            >
              <div className="v2-timeline-content" style={timelineContentStyle}>
                {(timeline.timelineTicks?.length ? timeline.timelineTicks : view.timeline.timelineTicks || []).map((tick, index) => (
                  <span
                    key={`${tick.label}-${tick.time ?? index}`}
                    className={tick.importance === "major" ? "is-major" : tick.importance === "minor" ? "is-minor" : "is-micro"}
                    style={tickStyle(tick, index)}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
              <span
                className="v2-playhead v2-playhead-ruler"
                data-v2-playhead="ruler"
                style={{ "--playhead-left": `${playheadLeft}px` }}
                aria-hidden="true"
                onPointerDown={handlePlayheadPointerDown}
              />
            </div>
          </div>

          <div className="v2-lane-row">
            <div className="v2-lane-label">
              <CoolIcon name="users" />
              {capabilities.canAddFormation && <button className="v2-track-add-button" type="button" aria-label="대형 추가" onClick={() => runtimeActions.addFormation?.({ forceAppend: true })}>+</button>}
            </div>
            <div className="v2-formation-lane">
              <div
                className="v2-timeline-viewport"
                ref={setTimelineViewportNode}
                onPointerDown={(event) => runtimeActions.timelinePointerDown?.(event, { kind: "surface" })}
                onPointerMove={runtimeActions.timelinePointerMove}
                onPointerUp={runtimeActions.timelinePointerUp}
                onPointerCancel={runtimeActions.timelinePointerUp}
                onTouchStart={(event) => handleTimelineTouchStart(event, { kind: "surface" })}
                onTouchMove={handleTimelineTouchMove}
                onTouchEnd={handleTimelineTouchEnd}
                onTouchCancel={handleTimelineTouchEnd}
              >
                <div className="v2-timeline-content" style={timelineContentStyle}>
                  {visualSegments.map((segment, index) => {
                    const targetSectionId = segment.toSectionId || segment.sectionId || "";
                    const section = sections.find((item) => item.id === targetSectionId) || sections[index] || {};
                    const isMove = segment.kind === "move";
                    const segmentBadge = segment.label || (isMove ? `M${index + 1}` : `F${index + 1}`);
                    const segmentTitle = isMove ? "Move" : section.name || "대형";
                    const durationLabel = segmentDurationLabel(segment);
                    const sectionSelected = !isMove && section.id && section.id === selectedSectionId;
                    const moveSelected = isMove && section.id && section.id === selectedSectionId;
                    const sectionCurrent = section.id && section.id === currentSectionId;
                    const blockedEdge = timeline.timelineBlockedEdge?.sectionId === section.id ? timeline.timelineBlockedEdge.edge : "";
                    return (
                      <button
                        key={`${segment.kind || "hold"}-${segment.fromSectionId || section.id || index}-${segment.toSectionId || section.id || index}-${index}`}
                        className={[
                          isMove ? "v2-move-block" : "v2-formation-block",
                          (sectionSelected || moveSelected) ? "is-selected" : "",
                          sectionCurrent ? "is-current" : "",
                          !isMove && blockDragPreview?.sectionId === section.id ? "is-dragging-source" : "",
                          blockedEdge ? `is-blocked-${blockedEdge}` : ""
                        ].filter(Boolean).join(" ")}
                        data-v2-formation-block={section.id || segment.sectionId || ""}
                        data-v2-segment-kind={segment.kind || "hold"}
                        data-v2-segment-label={segmentBadge}
                        data-v2-segment-duration={durationLabel || undefined}
                        data-v2-blocked-edge={blockedEdge || undefined}
                        style={timelineStyle(segment.leftPx, segment.widthPx)}
                        type="button"
                        aria-label={isMove ? `${segmentBadge} Move transition ${durationLabel}` : `${segmentBadge} ${segmentTitle} formation ${durationLabel}`}
                        aria-pressed={sectionSelected}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          if (isMove) {
                            runtimeActions.timelinePointerDown?.(event, { kind: "move-block", sectionId: section.id || "" });
                          } else if (section.id) {
                            runtimeActions.formationPointerDown?.(
                              event,
                              section,
                              sections.findIndex((item) => item.id === section.id),
                              "body",
                              { kind: "hold-block", sectionId: section.id }
                            );
                          } else {
                            runtimeActions.timelinePointerDown?.(event, { kind: "hold-block", sectionId: "" });
                          }
                        }}
                        onClick={() => {
                          if (section.id) runtimeActions.selectFormation?.(section);
                        }}
                      >
                        <span className="v2-segment-badge">{segmentBadge}</span>
                        <span className="v2-segment-name">{segmentTitle}</span>
                        {durationLabel && <span className="v2-segment-duration">{durationLabel}</span>}
                        {!isMove && capabilities.canEditTimeline && segment.resizable && (
                          <>
                            <span
                              className="v2-timeline-handle v2-timeline-handle-left"
                              data-v2-timeline-handle="hold-left"
                              data-v2-section-id={section.id || ""}
                              aria-hidden="true"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                runtimeActions.timelineHandlePointerDown?.(event, section.id, "hold-left", segment);
                              }}
                            />
                            <span
                              className="v2-timeline-handle v2-timeline-handle-right"
                              data-v2-timeline-handle="hold-right"
                              data-v2-section-id={section.id || ""}
                              aria-hidden="true"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                runtimeActions.timelineHandlePointerDown?.(event, section.id, "hold-right", segment);
                              }}
                            />
                          </>
                        )}
                        {isMove && moveSelected && capabilities.canEditTimeline && (
                          <span
                            className="v2-timeline-handle v2-timeline-handle-left"
                            data-v2-timeline-handle="move-left"
                            data-v2-section-id={section.id || ""}
                            aria-hidden="true"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              runtimeActions.timelineHandlePointerDown?.(event, section.id, "move-left", segment);
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                  {timeline.timelineReorderGuide && (
                    <span
                      className={[
                        "v2-reorder-preview",
                        timeline.timelineReorderGuide.isEndSlot ? "is-end-slot" : ""
                      ].filter(Boolean).join(" ")}
                      data-v2-reorder-preview
                      style={{ "--reorder-left": `${timeline.timelineReorderGuide.leftPx}px` }}
                      aria-hidden="true"
                    >
                      <span>{timeline.timelineReorderGuide.slotLabel}</span>
                    </span>
                  )}
                  {blockDragPreview && (
                    <span
                      className={[
                        "v2-drop-preview-slot",
                        blockDragPreviewAction ? `is-${blockDragPreviewAction}` : "",
                        blockDragPreview.isEndSlot ? "is-end-slot" : "",
                        blockDragPreview.blockedEdge ? "is-blocked" : ""
                      ].filter(Boolean).join(" ")}
                      data-v2-drop-preview
                      data-v2-drop-action={blockDragPreviewAction || undefined}
                      data-v2-reorder-preview
                      data-v2-blocked-edge={blockDragPreview.blockedEdge || undefined}
                      style={dropPreviewStyle}
                      aria-hidden="true"
                    >
                      <span>{blockDragPreview.dropLabel || (blockDragPreview.isEndSlot ? "마지막에 배치" : "여기에 배치")}</span>
                    </span>
                  )}
                </div>
                {timeline.snapPixel !== null && timeline.snapPixel !== undefined && (
                  <span className="v2-snapline" style={{ "--snap-left": `${timeline.snapPixel}px` }} aria-hidden="true" />
                )}
                <span
                  className="v2-track-playhead"
                  data-v2-playhead="formation"
                  style={{ "--playhead-left": `${playheadLeft}px` }}
                  aria-hidden="true"
                  onPointerDown={handlePlayheadPointerDown}
                />
              </div>
            </div>
          </div>

          <div className="v2-audio-row" aria-label="Audio reference lane">
            <div className="v2-audio-tools">
              <CoolIcon name="note" />
              {capabilities.canAddAudio && <button className="v2-track-add-button" type="button" aria-label="음악 추가" onClick={runtimeActions.addAudio}>+</button>}
            </div>
            <div className="v2-waveform" aria-hidden="true" data-v2-waveform>
              <div
                className="v2-timeline-viewport"
                onPointerDown={(event) => runtimeActions.timelinePointerDown?.(event, { kind: "audio-lane" })}
                onPointerMove={runtimeActions.timelinePointerMove}
                onPointerUp={runtimeActions.timelinePointerUp}
                onPointerCancel={runtimeActions.timelinePointerUp}
                onTouchStart={(event) => handleTimelineTouchStart(event, { kind: "audio-lane" })}
                onTouchMove={handleTimelineTouchMove}
                onTouchEnd={handleTimelineTouchEnd}
                onTouchCancel={handleTimelineTouchEnd}
              >
                <div
                  className="v2-timeline-content v2-waveform-content"
                  style={timelineContentStyle}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    runtimeActions.timelinePointerDown?.(event, { kind: "waveform" });
                  }}
                >
                  {waveformSamples.map((sample, index) => (
                    <span
                      key={`${sample}-${index}`}
                      style={{
                        "--sample-height": `${Math.round(8 + sample * 38)}px`,
                        "--sample-alpha": `${0.34 + sample * 0.6}`
                      }}
                    />
                  ))}
                </div>
                <span
                  className="v2-track-playhead"
                  data-v2-playhead="audio"
                  style={{ "--playhead-left": `${playheadLeft}px` }}
                  aria-hidden="true"
                  onPointerDown={handlePlayheadPointerDown}
                />
              </div>
            </div>
          </div>
        </section>

        {blockDragPreview && floatingBlockStyle && (
          <div
            className={[
              "v2-floating-block-preview",
              blockDragPreview.blockedEdge ? "is-blocked" : ""
            ].filter(Boolean).join(" ")}
            data-v2-floating-block-preview
            style={floatingBlockStyle}
            aria-hidden="true"
          >
            <span>{blockDragPreview.label || "Formation"}</span>
          </div>
        )}

        <nav className="v2-bottom-rail" data-v2-bottom-rail aria-label="Selected item actions">
          {(view.bottomRail || []).map((action) => (
            <IconButton
              key={action.key || action.label}
              icon={action.icon}
              label={action.label}
              primary={action.primary}
              active={Boolean(action.active)}
              disabled={Boolean(action.disabled)}
              onClick={() => runBottomAction(action)}
            />
          ))}
        </nav>
      </section>
    </main>
  );
}

export default V2VisualEditor;
