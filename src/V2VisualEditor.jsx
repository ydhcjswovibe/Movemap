import React, { useEffect, useMemo, useRef, useState } from "react";
import CoolIcon from "./icons/CoolIcon.jsx";
import { v2StageTokenPixelMetrics } from "./stageVisualMetrics.mjs";
import "./v2VisualEditor.css";

const V2_BLOCK_TAP_SLOP_MOUSE_PX = 18;
const V2_BLOCK_TAP_SLOP_TOUCH_PX = 24;
const V2_STAGE_TAP_SLOP_MOUSE_PX = 10;
const V2_STAGE_TAP_SLOP_TOUCH_PX = 16;
const V2_TRIM_HIT_RATIO = 0.15;
const V2_TRIM_HIT_MIN_WIDTH_PX = 10;
const V2_SELECTED_TRIM_HIT_MAX_WIDTH_PX = 24;
const V2_HOVER_TRIM_HIT_MAX_WIDTH_PX = 20;
const V2_TRIM_BODY_MIN_WIDTH_PX = 12;
const V2_TIMELINE_HANDLE_PILL_WIDTH_PX = 7;
const V2_TRIM_HOVER_DELAY_MS = 80;

function v2TrimHitWidthForBlockWidth(blockWidth, mode = "selected") {
  const segmentWidth = Math.max(0, Number(blockWidth) || 0);
  const maxHitWidth = mode === "selected" ? V2_SELECTED_TRIM_HIT_MAX_WIDTH_PX : V2_HOVER_TRIM_HIT_MAX_WIDTH_PX;
  const preferredWidth = Math.max(V2_TRIM_HIT_MIN_WIDTH_PX, segmentWidth * V2_TRIM_HIT_RATIO);
  const bodySafeWidth = Math.max(1, (segmentWidth - V2_TRIM_BODY_MIN_WIDTH_PX) / 2);
  return Math.max(1, Math.min(preferredWidth, maxHitWidth, bodySafeWidth));
}

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
  const resolved = String(performer.resolvedTokenLabel || performer.tokenLabel || "").trim();
  if (resolved) return resolved;
  const value = String(performer.name || performer.label || performer.id || "").trim();
  return Array.from(value.replace(/\s+/g, "")).slice(0, /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value) ? 2 : 3).join("") || performer.id;
}

function roleClass(performer) {
  return performer.role === "groupB" || performer.group === "groupB" || performer.group === "b" ? "b" : "a";
}

function V2TemplateMiniStage({ preview = {}, label = "" }) {
  const stage = preview.stage || { width: 12, height: 8 };
  const width = Math.max(1, Number(stage.width) || 12);
  const height = Math.max(1, Number(stage.height) || 8);
  const gridWidth = Math.floor(width);
  const gridHeight = Math.floor(height);
  const tokenRadius = Math.max(0.18, Math.min(width, height) * 0.035);
  const positions = Object.entries(preview.positions || {});
  const gridLinesX = Array.from({ length: gridWidth + 1 }, (_, index) => index);
  const gridLinesY = Array.from({ length: gridHeight + 1 }, (_, index) => index);

  return (
    <svg
      className="v2-template-mini-stage"
      data-v2-template-mini-stage
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${label} mini stage`}
    >
      <rect className="v2-template-mini-stage-bg" x="0" y="0" width={width} height={height} rx="0.18" />
      <g className="v2-template-mini-stage-grid" aria-hidden="true">
        {gridLinesX.map((x) => <line key={`x-${x}`} x1={x} y1="0" x2={x} y2={height} />)}
        {gridLinesY.map((y) => <line key={`y-${y}`} x1="0" y1={y} x2={width} y2={y} />)}
      </g>
      <rect className="v2-template-mini-stage-outline" x="0" y="0" width={width} height={height} rx="0.18" />
      <g className="v2-template-mini-stage-tokens">
        {positions.map(([performerId, position], index) => (
          <circle
            key={performerId}
            data-v2-template-token
            cx={Math.max(0, Math.min(width, Number(position.x) || 0))}
            cy={Math.max(0, Math.min(height, Number(position.y) || 0))}
            r={tokenRadius}
            className={index % 2 ? "is-alt" : ""}
          />
        ))}
      </g>
    </svg>
  );
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
      bottomSheet: null,
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
    actionBar: model.actionBar || model.bottomRail || [],
    bottomRail: model.bottomRail || model.actionBar || [],
    bottomRailMode: model.actionBarState || model.bottomRailMode || "default",
    bottomSheet: model.bottomSheet || null,
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
  const stageTapGestureRef = useRef(null);
  const blockTapGestureRef = useRef(null);
  const settingsHoverTimerRef = useRef(null);
  const trimHoverTimerRef = useRef(null);
  const pendingTrimHoverRef = useRef(null);
  const suppressNextTokenClickRef = useRef(false);
  const suppressNextStageClickRef = useRef(false);
  const [openTopMenu, setOpenTopMenu] = useState("");
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  const [hoverTrimTarget, setHoverTrimTarget] = useState(null);
  const [stagePixelSize, setStagePixelSize] = useState({ width: 0, height: 0 });
  const view = buildDemoViewModel(model);
  const { shell, stage, stageInfoLine, selection, timeline, sections, share } = view;
  const runtimeActions = { ...(view.actions || {}), ...actions };
  const capabilities = view.capabilities || {};
  const bottomRailMode = view.bottomRailMode || "default";
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
  const selectedSectionId = selection.selectedSectionId || "";
  const currentSectionId = timeline.currentSectionId || "";
  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const timelineContentWidth = Math.max(320, Number(timeline.timelineContentWidth ?? timeline.contentWidth) || 320);
  const timelineScrollX = Math.max(0, Number(timeline.timelineScrollX ?? timeline.scrollX) || 0);
  const rawPlayheadLeft = Number(timeline.playheadPixel);
  const playheadLeft = Number.isFinite(rawPlayheadLeft) ? rawPlayheadLeft : 0;
  const timelineSegments = timeline.holdMoveSegments?.length ? timeline.holdMoveSegments : timeline.timelineVisualSegments || [];
  const usesDemoModel = !model?.timeline && !model?.sections && !model?.sortedSections;
  const visualSegments = timelineSegments.length ? timelineSegments : usesDemoModel ? demoTimelineSegments : [];
  const waveformSamples = timeline.waveformBars?.length ? timeline.waveformBars : demoWaveformSamples;
  const waveformPlayedPercent = clampPercent(Number(timeline.waveformPlayedPercent) || 0);
  const waveformStatus = timeline.waveformStatus || "idle";
  const timelineContentStyle = {
    width: `${timelineContentWidth}px`,
    transform: `translateX(${-timelineScrollX}px)`
  };
  const timelineHandleHitWidth = (segment, mode = "selected") => {
    return v2TrimHitWidthForBlockWidth(segment?.widthPx, mode);
  };
  const timelineHandleStyle = (segment, edge, mode = "selected") => {
    const segmentLeft = Number(segment?.leftPx) || 0;
    const segmentWidth = Math.max(0, Number(segment?.widthPx) || 0);
    const edgeX = edge === "left" ? segmentLeft : segmentLeft + segmentWidth;
    const rawViewportX = edgeX - timelineScrollX;
    const viewportWidth = Math.max(0, Number(timeline.timelineViewportWidth ?? timeline.viewportWidth) || 0);
    const edgeVisibilityInset = V2_TIMELINE_HANDLE_PILL_WIDTH_PX / 2;
    const edgeVisible = !viewportWidth || (rawViewportX >= edgeVisibilityInset && rawViewportX <= viewportWidth - edgeVisibilityInset);
    const selected = mode === "selected";
    const hover = mode === "hover";
    const handleHitWidth = timelineHandleHitWidth(segment, selected ? "selected" : hover ? "hover" : "hover");
    const rawHandleViewportX = selected && edge === "left" ? rawViewportX + handleHitWidth / 2 : rawViewportX;
    if (!viewportWidth || ((!selected && !hover) && !edgeVisible)) {
      return {
        left: `${rawHandleViewportX}px`,
        "--v2-timeline-handle-hit-width": `${handleHitWidth}px`,
        "--v2-timeline-handle-pill-shift": `${rawViewportX - rawHandleViewportX}px`
      };
    }
    const clampInset = selected && edge === "left" ? handleHitWidth / 2 : handleHitWidth;
    const clampedViewportX = Math.max(clampInset, Math.min(Math.max(clampInset, viewportWidth - clampInset), rawHandleViewportX));
    return {
      left: `${clampedViewportX}px`,
      "--v2-timeline-handle-hit-width": `${handleHitWidth}px`,
      "--v2-timeline-handle-pill-shift": `${rawViewportX - clampedViewportX}px`
    };
  };
  const timelineHandleEdgeVisible = (segment, edge) => {
    const segmentLeft = Number(segment?.leftPx) || 0;
    const segmentWidth = Math.max(0, Number(segment?.widthPx) || 0);
    const edgeX = edge === "left" ? segmentLeft : segmentLeft + segmentWidth;
    const viewportWidth = Math.max(0, Number(timeline.timelineViewportWidth ?? timeline.viewportWidth) || 0);
    if (!viewportWidth) return true;
    const rawViewportX = edgeX - timelineScrollX;
    const edgeVisibilityInset = V2_TIMELINE_HANDLE_PILL_WIDTH_PX / 2;
    return rawViewportX >= edgeVisibilityInset && rawViewportX <= viewportWidth - edgeVisibilityInset;
  };
  const waveformContentStyle = {
    ...timelineContentStyle,
    "--waveform-played-percent": `${waveformPlayedPercent}%`,
    "--waveform-count": waveformSamples.length
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
  const resetTimelineViewportNativeScroll = (node) => {
    if (!node) return;
    if (node.scrollLeft !== 0) node.scrollLeft = 0;
    if (node.scrollTop !== 0) node.scrollTop = 0;
  };
  const setTimelineViewportNode = (node) => {
    if (model?.timelineViewportRef) model.timelineViewportRef.current = node;
    if (node) {
      resetTimelineViewportNativeScroll(node);
      runtimeActions.timelineViewportMeasured?.(node.getBoundingClientRect().width || 0);
    }
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
  const isStageTapBlockedTarget = (event) => Boolean(
    event?.target?.closest?.(".v2-token, .v2-zoom-rail")
  );
  const handleStageSurfacePointerDown = (event) => {
    if (isStageTapBlockedTarget(event)) return;
    stageTapGestureRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType || "mouse",
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic browser events may not support pointer capture.
    }
  };
  const updateStageTapGesture = (event) => {
    const gesture = stageTapGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return null;
    const slopPx = gesture.pointerType === "touch" ? V2_STAGE_TAP_SLOP_TOUCH_PX : V2_STAGE_TAP_SLOP_MOUSE_PX;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > slopPx) {
      gesture.moved = true;
    }
    return gesture;
  };
  const finishStageTapGesture = (event) => {
    const gesture = updateStageTapGesture(event);
    if (!gesture) return false;
    stageTapGestureRef.current = null;
    try {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    if (gesture.moved || isStageTapBlockedTarget(event)) return false;
    suppressNextStageClickRef.current = true;
    runtimeActions.stageTap?.(event, stageSurfaceRef.current);
    return true;
  };
  const isTimelineHandleEvent = (event) => Boolean(
    event?.target?.closest?.("[data-v2-timeline-handle]")
  );
  const consumeTimelineHandleEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const clearTrimHover = () => {
    if (trimHoverTimerRef.current) window.clearTimeout(trimHoverTimerRef.current);
    trimHoverTimerRef.current = null;
    pendingTrimHoverRef.current = null;
    setHoverTrimTarget(null);
  };
  const scheduleTrimHover = (sectionId, edge) => {
    if (!sectionId || !edge) {
      clearTrimHover();
      return;
    }
    if (hoverTrimTarget?.sectionId === sectionId && hoverTrimTarget?.edge === edge) return;
    if (pendingTrimHoverRef.current?.sectionId === sectionId && pendingTrimHoverRef.current?.edge === edge) return;
    if (trimHoverTimerRef.current) window.clearTimeout(trimHoverTimerRef.current);
    pendingTrimHoverRef.current = { sectionId, edge };
    trimHoverTimerRef.current = window.setTimeout(() => {
      trimHoverTimerRef.current = null;
      setHoverTrimTarget(pendingTrimHoverRef.current);
      pendingTrimHoverRef.current = null;
    }, V2_TRIM_HOVER_DELAY_MS);
  };
  const handleFormationBlockPointerMove = (event, section, sectionSelected) => {
    if (sectionSelected || !capabilities.canEditTimeline || !section?.id || event.pointerType === "touch") {
      clearTrimHover();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = Number(event.clientX);
    if (!Number.isFinite(pointerX) || !rect.width) {
      clearTrimHover();
      return;
    }
    const leftDistance = pointerX - rect.left;
    const rightDistance = rect.right - pointerX;
    const edgeZonePx = v2TrimHitWidthForBlockWidth(rect.width, "hover");
    if (leftDistance >= 0 && leftDistance <= edgeZonePx && leftDistance <= rightDistance) {
      scheduleTrimHover(section.id, "left");
    } else if (rightDistance >= 0 && rightDistance <= edgeZonePx) {
      scheduleTrimHover(section.id, "right");
    } else {
      clearTrimHover();
    }
  };
  const beginBlockTapGesture = (event, section, isMove) => {
    const currentGesture = blockTapGestureRef.current;
    if (
      currentGesture?.section?.id === section?.id &&
      Math.hypot((Number(event.clientX) || 0) - currentGesture.startX, (Number(event.clientY) || 0) - currentGesture.startY) <= 1
    ) {
      return;
    }
    currentGesture?.cleanup?.();
    if (isMove || !section?.id) {
      blockTapGestureRef.current = null;
      return;
    }
    const gesture = {
      pointerId: event.pointerId ?? null,
      pointerType: event.pointerType || "mouse",
      section,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      cleanup: null
    };
    const trackMove = (moveEvent) => {
      if (moveEvent.pointerId !== undefined && gesture.pointerId !== null && moveEvent.pointerId !== gesture.pointerId) return;
      gesture.lastX = moveEvent.clientX;
      gesture.lastY = moveEvent.clientY;
    };
    const finish = (upEvent) => {
      if (upEvent.pointerId !== undefined && gesture.pointerId !== null && upEvent.pointerId !== gesture.pointerId) return;
      gesture.cleanup?.();
      if (blockTapGestureRef.current === gesture) blockTapGestureRef.current = null;
      const endX = Number.isFinite(upEvent.clientX) ? upEvent.clientX : gesture.lastX;
      const endY = Number.isFinite(upEvent.clientY) ? upEvent.clientY : gesture.lastY;
      const slopPx = gesture.pointerType === "touch" ? V2_BLOCK_TAP_SLOP_TOUCH_PX : V2_BLOCK_TAP_SLOP_MOUSE_PX;
      if (Math.hypot(endX - gesture.startX, endY - gesture.startY) <= slopPx) {
        runtimeActions.selectFormation?.(section, { force: true });
      }
    };
    const cancel = () => {
      gesture.cleanup?.();
      if (blockTapGestureRef.current === gesture) blockTapGestureRef.current = null;
    };
    gesture.cleanup = () => {
      window.removeEventListener("pointermove", trackMove, true);
      window.removeEventListener("mousemove", trackMove, true);
      window.removeEventListener("pointerup", finish, true);
      window.removeEventListener("mouseup", finish, true);
      window.removeEventListener("pointercancel", cancel, true);
    };
    blockTapGestureRef.current = gesture;
    window.addEventListener("pointermove", trackMove, true);
    window.addEventListener("mousemove", trackMove, true);
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("mouseup", finish, true);
    window.addEventListener("pointercancel", cancel, true);
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
    } else if (key === "new-project") {
      runtimeActions.newProject?.();
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
    if (action.sheet) {
      runtimeActions.toggleBottomSheet?.(action.sheet, action.mode);
      return;
    }
    if (action.mode) {
      runtimeActions.setActiveTab?.(action.mode);
      return;
    }
    if (action.key === "add-formation") {
      runtimeActions.addFormation?.({ forceCreate: true });
      return;
    }
    if (action.key === "duplicate-formation" || action.key === "duplicate-performer") {
      runtimeActions.duplicate?.();
      return;
    }
    if (action.key === "delete-formation" || action.key === "delete-performer" || action.key === "delete-performers") {
      runtimeActions.delete?.();
      return;
    }
    if (action.key === "align-x" || action.key === "align-y") {
      runtimeActions.mobileAction?.(action.key);
      return;
    }
    if (action.key === "clear-selection") {
      runtimeActions.mobileAction?.("clear-selection");
      return;
    }
    runtimeActions.mobileAction?.(action.key);
  };
  const runBottomSheetHeaderAction = (action) => {
    if (!action || action.disabled) return;
    if (action.key === "close-sheet") {
      runtimeActions.toggleBottomSheet?.(view.bottomSheet.key);
      return;
    }
    if (action.key === "multi-select") {
      runtimeActions.enterFormationMultiSelect?.();
      return;
    }
    if (action.key === "select-all-formations") {
      runtimeActions.selectAllFormations?.();
      return;
    }
    if (action.key === "delete-selected-formations") {
      const checkedIds = Array.isArray(action.sectionIds)
        ? action.sectionIds
        : (view.bottomSheet.items || [])
            .filter((item) => item.checked)
            .map((item) => item.sectionId)
            .filter(Boolean);
      runtimeActions.deleteSelectedFormations?.(checkedIds);
      return;
    }
    if (action.key === "cancel-multi-select") {
      runtimeActions.cancelFormationMultiSelect?.();
      return;
    }
    if (action.key === "replace-audio") {
      runtimeActions.addAudio?.();
      return;
    }
    if (action.key === "edit-performer") {
      runtimeActions.toggleSelectedPerformerInspectorEdit?.();
      return;
    }
    if (action.key === "duplicate-performer") {
      runtimeActions.duplicateSelectedPerformer?.();
      return;
    }
    if (action.key === "delete-performer") {
      runtimeActions.requestDeleteSelectedPerformer?.();
      return;
    }
    if (action.key === "confirm-delete-performer") {
      runtimeActions.confirmDeleteSelectedPerformer?.();
      return;
    }
    if (action.key === "cancel-delete-performer") {
      runtimeActions.cancelDeleteSelectedPerformer?.();
      return;
    }
    runBottomAction(action);
  };
  const runBottomSheetItem = (item) => {
    if (!item || item.disabled) return;
    if (item.action === "select-formation") {
      const section = sectionById.get(item.sectionId);
      if (section) runtimeActions.selectFormation?.(section, { force: true });
      return;
    }
    if (item.action === "toggle-formation-selection") {
      runtimeActions.toggleFormationMultiSelect?.(item.sectionId);
      return;
    }
    if (item.kind === "formation-template") {
      runtimeActions.selectTemplate?.(item.templateId);
      return;
    }
    if (item.action === "select-performer") {
      runtimeActions.selectPerformer?.(item.performerId, { keepSheetOpen: true });
      return;
    }
    if (item.action === "add-formation") {
      runtimeActions.addFormation?.({ forceCreate: true });
      return;
    }
    if (item.key === "toggle-snap") {
      runtimeActions.toggleSnap?.();
      return;
    }
    if (item.key === "toggle-stage-references") {
      runtimeActions.toggleStageReferences?.();
      return;
    }
    if (item.key === "toggle-stage-reference-labels") {
      runtimeActions.toggleStageReferenceLabels?.();
      return;
    }
    if (item.key === "toggle-transition-paths") {
      runtimeActions.toggleTransitionPaths?.();
      return;
    }
    runtimeActions.mobileAction?.(item.action || item.key);
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
      if (trimHoverTimerRef.current) window.clearTimeout(trimHoverTimerRef.current);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    clearTrimHover();
  }, [selectedSectionId, capabilities.canEditTimeline]);

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
            <div
              className={`v2-stage-info-line v2-stage-info-line-${stageInfoLine?.state || "empty"}`}
              data-v2-stage-info-line
              data-v2-stage-info-state={stageInfoLine?.state || "empty"}
              data-v2-stage-info-section={stageInfoLine?.sectionId || undefined}
              data-v2-stage-info-performer={stageInfoLine?.performerId || undefined}
            >
              <span>{stageInfoLine?.leftLabel || "No formation"}</span>
              <span>{stageInfoLine?.rightLabel || "Snap on · 12x8 · 1m grid"}</span>
            </div>
          )}
          <div
            className="v2-stage-surface"
            ref={stageSurfaceRef}
            style={stageSurfaceStyle}
            onPointerDown={handleStageSurfacePointerDown}
            onPointerMove={(event) => {
              const gesture = tokenGestureRef.current;
              if (gesture?.pointerId === event.pointerId && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 3) {
                gesture.moved = true;
              }
              updateStageTapGesture(event);
              runtimeActions.stagePointerMove?.(event, stageSurfaceRef.current);
            }}
            onPointerUp={(event) => {
              const gesture = tokenGestureRef.current;
              if (gesture?.pointerId === event.pointerId) {
                suppressNextTokenClickRef.current = Boolean(gesture.moved || gesture.additive);
                tokenGestureRef.current = null;
              }
              finishStageTapGesture(event);
              runtimeActions.stagePointerUp?.(event);
            }}
            onPointerCancel={(event) => {
              tokenGestureRef.current = null;
              stageTapGestureRef.current = null;
              runtimeActions.stagePointerUp?.(event);
            }}
            onClick={(event) => {
              if (suppressNextStageClickRef.current) {
                suppressNextStageClickRef.current = false;
                return;
              }
              runtimeActions.stageTap?.(event, stageSurfaceRef.current);
            }}
          >
            <div className="v2-stage-grid" data-v2-stage-grid aria-hidden="true" />
            {stage.referencesVisible && (
              <div className="v2-stage-guide-layer" data-v2-stage-guides aria-hidden="true">
                <svg className="v2-stage-reference-svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                  {(stage.referenceGuides || [])
                    .filter((reference) => !["front-line", "left-hash", "right-hash"].includes(reference.id))
                    .map((reference) => reference.type === "point" ? (
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
                    "--token-color": performer.color || undefined,
                    "--token-text-color": performer.tokenTextColor || undefined
                  }}
                  type="button"
                  aria-label={`${performerLabel(performer)} performer`}
                  aria-pressed={selected}
                  onPointerDown={(event) => {
                    tokenGestureRef.current = {
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      additive: Boolean(event.shiftKey || event.metaKey),
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
              {capabilities.canAddFormation && <button className="v2-track-add-button" type="button" aria-label="대형 추가" onClick={() => runtimeActions.addFormation?.({ forceCreate: true })}>+</button>}
            </div>
            <div className="v2-formation-lane">
              <div
                className="v2-timeline-viewport"
                ref={setTimelineViewportNode}
                onPointerDown={(event) => runtimeActions.timelinePointerDown?.(event, { kind: "surface" })}
                onPointerMove={runtimeActions.timelinePointerMove}
                onPointerUp={runtimeActions.timelinePointerUp}
                onPointerCancel={runtimeActions.timelinePointerUp}
                onScroll={(event) => resetTimelineViewportNativeScroll(event.currentTarget)}
                onTouchStart={(event) => handleTimelineTouchStart(event, { kind: "surface" })}
                onTouchMove={handleTimelineTouchMove}
                onTouchEnd={handleTimelineTouchEnd}
                onTouchCancel={handleTimelineTouchEnd}
              >
                <div className="v2-timeline-content" style={timelineContentStyle}>
                  {visualSegments.map((segment, index) => {
                    const targetSectionId = segment.toSectionId || segment.sectionId || "";
                    const section = sectionById.get(targetSectionId) || sections[index] || {};
                    const isMove = segment.kind === "move";
                    const segmentBadge = segment.label || (isMove ? `M${index + 1}` : `F${index + 1}`);
                    const segmentTitle = isMove ? "Move" : section.name || "대형";
                    const durationLabel = segmentDurationLabel(segment);
                    const sectionSelected = !isMove && section.id && section.id === selectedSectionId;
                    const sectionCurrent = section.id && section.id === currentSectionId;
                    const blockedEdgeState = timeline.timelineBlockedEdge;
                    const blockedEdge = !isMove && blockedEdgeState && blockedEdgeState.sectionId === section.id ? blockedEdgeState.edge : "";
                    return (
                      <button
                        key={`${segment.kind || "hold"}-${segment.fromSectionId || section.id || index}-${segment.toSectionId || section.id || index}-${index}`}
                        className={[
                          isMove ? "v2-move-block" : "v2-formation-block",
                          sectionSelected ? "is-selected" : "",
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
                        onPointerDownCapture={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          clearTrimHover();
                          beginBlockTapGesture(event, section, isMove);
                        }}
                        onMouseDownCapture={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          clearTrimHover();
                          beginBlockTapGesture({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            pointerId: null,
                            pointerType: "mouse"
                          }, section, isMove);
                        }}
                        onMouseDown={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          clearTrimHover();
                          beginBlockTapGesture({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            pointerId: null,
                            pointerType: "mouse"
                          }, section, isMove);
                        }}
                        onMouseUp={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          const gesture = blockTapGestureRef.current;
                          if (!gesture || isMove || !section.id || gesture.section?.id !== section.id) return;
                          gesture.cleanup?.();
                          blockTapGestureRef.current = null;
                          const slopPx = gesture.pointerType === "touch" ? V2_BLOCK_TAP_SLOP_TOUCH_PX : V2_BLOCK_TAP_SLOP_MOUSE_PX;
                          if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) <= slopPx) {
                            runtimeActions.selectFormation?.(section, { force: true });
                          }
                        }}
                        onPointerMove={(event) => {
                          if (isMove || isTimelineHandleEvent(event)) return;
                          handleFormationBlockPointerMove(event, section, sectionSelected);
                        }}
                        onMouseMove={(event) => {
                          if (isMove || isTimelineHandleEvent(event)) return;
                          handleFormationBlockPointerMove(event, section, sectionSelected);
                        }}
                        onPointerLeave={(event) => {
                          const relatedHandle = event?.relatedTarget?.closest?.("[data-v2-timeline-handle]");
                          if (!sectionSelected && relatedHandle?.getAttribute("data-v2-section-id") !== section.id) clearTrimHover();
                        }}
                        onMouseLeave={(event) => {
                          const relatedHandle = event?.relatedTarget?.closest?.("[data-v2-timeline-handle]");
                          if (!sectionSelected && relatedHandle?.getAttribute("data-v2-section-id") !== section.id) clearTrimHover();
                        }}
                        onPointerDown={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          clearTrimHover();
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
                        onClick={(event) => {
                          if (isTimelineHandleEvent(event)) return;
                          if (!isMove && section.id) runtimeActions.selectFormation?.(section);
                        }}
                      >
                        <span className="v2-segment-badge">{segmentBadge}</span>
                        <span className="v2-segment-name">{segmentTitle}</span>
                        {durationLabel && <span className="v2-segment-duration">{durationLabel}</span>}
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
              {visualSegments.map((segment, index) => {
                const targetSectionId = segment.toSectionId || segment.sectionId || "";
                const section = sectionById.get(targetSectionId) || sections[index] || {};
                const isMove = segment.kind === "move";
                const sectionSelected = !isMove && section.id && section.id === selectedSectionId;
                const sectionHovered = !sectionSelected && hoverTrimTarget?.sectionId === section.id;
                if (isMove || !section.id || !capabilities.canEditTimeline || (!sectionSelected && !sectionHovered)) return null;
                const handleMode = sectionSelected ? "selected" : "hover";
                const showLeftHandle = sectionSelected || hoverTrimTarget?.edge === "left";
                const showRightHandle = sectionSelected || hoverTrimTarget?.edge === "right";
                const edgeVisibleClass = (edge) => timelineHandleEdgeVisible(segment, edge) ? "is-edge-visible" : "";
                return (
                  <React.Fragment key={`handles-${segment.kind || "hold"}-${section.id}-${index}`}>
                      {showLeftHandle && (
                        <span
                        className={[
                          "v2-timeline-handle",
                          "v2-timeline-handle-left",
                          sectionSelected ? "is-selected" : "",
                          sectionHovered ? "is-hover-trim" : "",
                          edgeVisibleClass("left")
                        ].filter(Boolean).join(" ")}
                        data-v2-timeline-handle="hold-left"
                        data-v2-section-id={section.id || ""}
                        data-v2-trim-activation={handleMode}
                        aria-hidden="true"
                        style={timelineHandleStyle(segment, "left", handleMode)}
                        onPointerDown={(event) => {
                          consumeTimelineHandleEvent(event);
                          runtimeActions.timelineHandlePointerDown?.(event, section.id, "hold-left", segment);
                        }}
                        onPointerLeave={() => {
                          if (handleMode === "hover") clearTrimHover();
                        }}
                        onMouseDown={consumeTimelineHandleEvent}
                        onClick={consumeTimelineHandleEvent}
                      />
                    )}
                    {showRightHandle && (
                      <span
                      className={[
                        "v2-timeline-handle",
                        "v2-timeline-handle-right",
                        sectionSelected ? "is-selected" : "",
                        sectionHovered ? "is-hover-trim" : "",
                        edgeVisibleClass("right")
                      ].filter(Boolean).join(" ")}
                      data-v2-timeline-handle="hold-right"
                      data-v2-section-id={section.id || ""}
                      data-v2-trim-activation={handleMode}
                      aria-hidden="true"
                      style={timelineHandleStyle(segment, "right", handleMode)}
                      onPointerDown={(event) => {
                        consumeTimelineHandleEvent(event);
                        runtimeActions.timelineHandlePointerDown?.(event, section.id, "hold-right", segment);
                      }}
                      onPointerLeave={() => {
                        if (handleMode === "hover") clearTrimHover();
                      }}
                      onMouseDown={consumeTimelineHandleEvent}
                      onClick={consumeTimelineHandleEvent}
                    />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="v2-audio-row" aria-label="Audio reference lane">
            <div className="v2-audio-tools">
              <CoolIcon name="note" />
              {capabilities.canAddAudio && <button className="v2-track-add-button" type="button" aria-label="음악 추가" onClick={runtimeActions.addAudio}>+</button>}
            </div>
            <div className="v2-waveform" aria-hidden="true" data-v2-waveform data-v2-waveform-status={waveformStatus}>
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
                  style={waveformContentStyle}
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
                        "--sample-alpha": `${0.34 + sample * 0.6}`,
                        "--sample-left": `${((index + 0.5) / Math.max(1, waveformSamples.length)) * 100}%`
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

        {view.bottomSheet && (
          <section
            className={`v2-bottom-sheet v2-bottom-sheet-${view.bottomSheet.key}`}
            data-v2-bottom-sheet={view.bottomSheet.key}
            data-v2-bottom-sheet-state={view.bottomSheet.state || "default"}
            data-v2-bottom-sheet-section={view.bottomSheet.selectedSectionId || undefined}
            aria-label={`${view.bottomSheet.title} 작업 시트`}
          >
            <div className="v2-bottom-sheet-header">
              <strong>{view.bottomSheet.headerLabel || view.bottomSheet.title}</strong>
              <div className="v2-bottom-sheet-header-actions">
                {(view.bottomSheet.headerActions || [{ key: "close-sheet", label: "닫기" }]).map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled={Boolean(action.disabled)}
                    onClick={() => runBottomSheetHeaderAction(action)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            {view.bottomSheet.key === "formation-details" && (
              <div className="v2-formation-details-sheet">
                <label>
                  <span>{view.bottomSheet.fields.name.label}</span>
                  <input
                    value={view.bottomSheet.fields.name.value}
                    readOnly={Boolean(view.bottomSheet.fields.name.disabled)}
                    aria-label={view.bottomSheet.fields.name.label}
                    onChange={(event) => runtimeActions.updateSelectedFormationMetadataField?.("name", event.target.value)}
                    onBlur={(event) => runtimeActions.finishSelectedFormationMetadataEdit?.("name", event.target.value)}
                  />
                </label>
                <label>
                  <span>{view.bottomSheet.fields.notes.label}</span>
                  <textarea
                    value={view.bottomSheet.fields.notes.value}
                    readOnly={Boolean(view.bottomSheet.fields.notes.disabled)}
                    aria-label={view.bottomSheet.fields.notes.label}
                    onChange={(event) => runtimeActions.updateSelectedFormationMetadataField?.("notes", event.target.value)}
                    onBlur={(event) => runtimeActions.finishSelectedFormationMetadataEdit?.("notes", event.target.value)}
                  />
                </label>
                <p>{view.bottomSheet.timeRangeLabel}</p>
                <p>타이밍은 타임라인에서, 위치는 무대에서 편집합니다.</p>
              </div>
            )}
            {view.bottomSheet.key === "formation-template" && (
              <div className="v2-template-sheet">
                <div className="v2-template-list">
                  {(view.bottomSheet.items || []).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={[
                        "v2-template-card",
                        item.active ? "is-active" : "",
                        item.disabled ? "is-disabled" : ""
                      ].filter(Boolean).join(" ")}
                      data-v2-template-card={item.templateId}
                      disabled={Boolean(item.disabled)}
                      aria-label={item.label}
                      onClick={() => runBottomSheetItem(item)}
                    >
                      <V2TemplateMiniStage preview={item.preview} label={item.label} />
                      <span className="v2-template-card-caption">{item.label}</span>
                      {item.stateLabel && <span className="v2-template-card-state">{item.stateLabel}</span>}
                    </button>
                  ))}
                </div>
                <div className="v2-template-actions">
                  {(view.bottomSheet.actions || []).map((action) => {
                    const handler = action.key === "save-current-template"
                      ? runtimeActions.saveCurrentFormationTemplate
                      : runtimeActions.addFormationFromSelectedTemplate;
                    return (
                      <button
                        key={action.key}
                        type="button"
                        disabled={Boolean(action.disabled)}
                        onClick={() => handler?.()}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {view.bottomSheet.key !== "formation-details" && view.bottomSheet.key !== "formation-template" && (
              <div className="v2-bottom-sheet-list">
              {view.bottomSheet.stateLabel && (
                <div className="v2-bottom-sheet-summary">{view.bottomSheet.stateLabel}</div>
              )}
              {view.bottomSheet.emptyState && (
                <div className="v2-bottom-sheet-empty" data-v2-empty-formations>
                  <strong>{view.bottomSheet.emptyState.label}</strong>
                  {view.bottomSheet.emptyState.action && (
                    <button
                      type="button"
                      disabled={Boolean(view.bottomSheet.emptyState.action.disabled)}
                      onClick={() => runtimeActions.addFormation?.({ forceCreate: true })}
                    >
                      {view.bottomSheet.emptyState.action.label}
                    </button>
                  )}
                </div>
              )}
              {(view.bottomSheet.items || []).map((item) => {
                if (item.kind === "formation-row") {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`v2-formation-list-row ${item.active ? "is-active" : ""} ${item.current ? "is-current" : ""}`}
                      data-v2-formation-list-row={item.sectionId}
                      data-v2-bottom-sheet-item={item.key}
                      onClick={() => runBottomSheetItem(item)}
                    >
                      <span className="v2-formation-row-sequence">{item.sequenceLabel}</span>
                      {typeof item.checked === "boolean" && (
                        <span className={`v2-formation-row-check ${item.checked ? "is-checked" : ""}`} aria-hidden="true" />
                      )}
                      <span className="v2-formation-row-name">{item.label}</span>
                      <span className="v2-formation-row-time">{item.timeRangeLabel}</span>
                    </button>
                  );
                }
                if (item.kind === "performer") {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`v2-cast-list-row ${item.active ? "is-active" : ""}`}
                      aria-pressed={Boolean(item.active)}
                      disabled={Boolean(item.disabled)}
                      data-v2-bottom-sheet-item={item.key}
                      data-v2-cast-row={item.performerId}
                      onClick={() => runBottomSheetItem(item)}
                    >
                      <span className="v2-cast-row-swatch" style={{ "--cast-row-color": item.color || "#64748b" }} aria-hidden="true" />
                      <span className="v2-cast-row-name">{item.label}</span>
                      <span className="v2-cast-row-token">{item.tokenLabel}</span>
                      {item.stateLabel && <span className="v2-cast-row-state">{item.stateLabel}</span>}
                    </button>
                  );
                }
                const isButton = item.kind !== "info";
                const content = (
                  <>
                    {item.icon && <CoolIcon name={item.icon} />}
                    <span className="v2-bottom-sheet-main">
                      <span>{item.label}</span>
                      {item.metaLabel && <em>{item.metaLabel}</em>}
                    </span>
                    {item.kind === "toggle" && (
                      <span className={`v2-bottom-sheet-switch ${item.checked ? "is-on" : ""}`} aria-hidden="true" />
                    )}
                    {item.stateLabel && <span className="v2-bottom-sheet-state">{item.stateLabel}</span>}
                  </>
                );
                return isButton ? (
                  <button
                    key={item.key}
                    type="button"
                    className={item.active ? "is-active" : ""}
                    aria-pressed={item.kind === "toggle" ? Boolean(item.checked) : Boolean(item.active)}
                    disabled={Boolean(item.disabled)}
                    data-v2-bottom-sheet-item={item.key}
                    onClick={() => runBottomSheetItem(item)}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={item.key} className="v2-bottom-sheet-info" data-v2-bottom-sheet-item={item.key}>
                    {content}
                  </div>
                );
              })}
              {view.bottomSheet.inspector && (
                <div
                  className={`v2-performer-inspector ${view.bottomSheet.inspector.deleteConfirming ? "is-delete-confirming" : ""}`}
                  data-v2-performer-inspector={view.bottomSheet.inspector.performerId}
                >
                  <div className="v2-performer-inspector-summary">
                    <span className="v2-performer-inspector-swatch" style={{ "--performer-inspector-color": view.bottomSheet.inspector.color || "#64748b" }} aria-hidden="true" />
                    <span>
                      <strong>{view.bottomSheet.inspector.name}</strong>
                      <em>{view.bottomSheet.inspector.resolvedTokenLabel}</em>
                    </span>
                  </div>
                  <div className="v2-performer-inspector-actions">
                    {view.bottomSheet.inspector.actions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        className={[
                          action.danger ? "is-danger" : "",
                          action.expanded ? "is-active" : ""
                        ].filter(Boolean).join(" ")}
                        disabled={Boolean(action.disabled)}
                        aria-pressed={action.key === "edit-performer" ? Boolean(action.expanded) : undefined}
                        onClick={() => runBottomSheetHeaderAction(action)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  {view.bottomSheet.inspector.deleteConfirming && (
                    <div className="v2-performer-delete-confirm" data-v2-performer-delete-confirm>
                      <span>삭제할까요?</span>
                      <button type="button" className="is-danger" onClick={() => runBottomSheetHeaderAction({ key: "confirm-delete-performer" })}>삭제</button>
                      <button type="button" onClick={() => runBottomSheetHeaderAction({ key: "cancel-delete-performer" })}>취소</button>
                    </div>
                  )}
                  {view.bottomSheet.inspector.actions.find((action) => action.key === "edit-performer")?.expanded && (
                    <div className="v2-performer-inspector-fields">
                      <label>
                        <span>{view.bottomSheet.inspector.fields.name.label}</span>
                        <input
                          value={view.bottomSheet.inspector.fields.name.value}
                          disabled={Boolean(view.bottomSheet.inspector.fields.name.disabled)}
                          aria-label={view.bottomSheet.inspector.fields.name.label}
                          onChange={(event) => runtimeActions.updateSelectedPerformerMetadataField?.("name", event.target.value)}
                          onBlur={(event) => runtimeActions.finishSelectedPerformerMetadataEdit?.("name", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>{view.bottomSheet.inspector.fields.tokenLabel.label}</span>
                        <input
                          value={view.bottomSheet.inspector.fields.tokenLabel.value}
                          disabled={Boolean(view.bottomSheet.inspector.fields.tokenLabel.disabled)}
                          aria-label={view.bottomSheet.inspector.fields.tokenLabel.label}
                          placeholder={view.bottomSheet.inspector.fields.tokenLabel.helper}
                          onChange={(event) => runtimeActions.updateSelectedPerformerMetadataField?.("tokenLabel", event.target.value)}
                          onBlur={(event) => runtimeActions.finishSelectedPerformerMetadataEdit?.("tokenLabel", event.target.value)}
                        />
                        <em>{view.bottomSheet.inspector.fields.tokenLabel.helper}</em>
                      </label>
                      <label className="v2-performer-color-field">
                        <span>{view.bottomSheet.inspector.fields.color.label}</span>
                        <input
                          type="color"
                          value={/^#(?:[0-9a-f]{6})$/i.test(view.bottomSheet.inspector.fields.color.value) ? view.bottomSheet.inspector.fields.color.value : "#64748b"}
                          disabled={Boolean(view.bottomSheet.inspector.fields.color.disabled)}
                          aria-label={view.bottomSheet.inspector.fields.color.label}
                          onChange={(event) => runtimeActions.updateSelectedPerformerMetadataField?.("color", event.target.value)}
                          onBlur={(event) => runtimeActions.finishSelectedPerformerMetadataEdit?.("color", event.target.value)}
                        />
                        <span className="v2-performer-color-value">{view.bottomSheet.inspector.fields.color.value || "#64748b"}</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
              {Boolean(view.bottomSheet.actions?.length) && (
                <div className="v2-bottom-sheet-actions">
                  {view.bottomSheet.actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      disabled={Boolean(action.disabled)}
                      onClick={() => runBottomSheetHeaderAction(action)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              </div>
            )}
          </section>
        )}

        <nav
          className={`v2-bottom-rail v2-action-bar v2-bottom-rail-${bottomRailMode}`}
          data-v2-bottom-rail
          data-v2-action-bar
          data-v2-action-bar-state={bottomRailMode}
          data-v2-bottom-rail-mode={bottomRailMode}
          aria-label={bottomRailMode === "formation" ? "선택 대형 도구" : "편집 작업"}
        >
          {(view.actionBar || view.bottomRail || []).map((action) => (
            <IconButton
              key={action.key || action.label}
              icon={action.icon}
              label={action.label}
              className={action.danger ? "is-danger" : ""}
              primary={action.primary}
              active={Boolean(action.active)}
              disabled={Boolean(action.disabled)}
              onClick={() => runBottomAction(action)}
            >
              <CoolIcon name={action.icon} />
              <span className="v2-bottom-label">{action.label}</span>
            </IconButton>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default V2VisualEditor;
