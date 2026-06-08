import React, { useEffect, useRef } from "react";
import Stage3dPreview from "./Stage3dPreview.jsx";
import IconHintButton from "./IconHintButton.jsx";
import TopActionDropdown, { TOP_ACTION_MENUS } from "./TopActionDropdown.jsx";
import { stageTokenMetrics, stageViewBox } from "./stageGeometry.mjs";

const GRID_MAJOR_STEP = 5;

function meterTicks(size = 0) {
  const rounded = Math.max(0, Math.floor(Number(size) || 0));
  return Array.from({ length: rounded + 1 }, (_, index) => index);
}

function stageMeterLabel(dimensions = {}) {
  const width = Math.round(Number(dimensions.width) || 0);
  const height = Math.round(Number(dimensions.height) || 0);
  return `${width}m x ${height}m`;
}

function shortTokenName(name = "") {
  return name.trim().slice(0, 2).toUpperCase();
}

function chipTime(section) {
  const seconds = Number(section?.arrivalTime ?? section?.startTime ?? 0);
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function preciseTime(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(value / 60);
  const secs = (value - mins * 60).toFixed(1).padStart(4, "0");
  return `${mins}:${secs}`;
}

function compactTime(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(value / 60);
  const secs = Math.round(value - mins * 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function blockTimeLabel(block, section) {
  if (block?.kind === "move") {
    const duration = Math.max(0, Number(block.displayEndTime) - Number(block.displayStartTime) || 0);
    return `Move · ${duration.toFixed(1)}s`;
  }
  if (block?.kind === "hold") {
    const duration = Math.max(0, Number(block.displayEndTime) - Number(block.displayStartTime) || 0);
    return `Hold · ${duration.toFixed(1)}s`;
  }
  if (Number.isFinite(block?.displayStartTime) && Number.isFinite(block?.displayEndTime)) {
    if (Math.abs(block.displayEndTime - block.displayStartTime) < 0.05) {
      return compactTime(block.displayEndTime);
    }
    return `${preciseTime(block.displayStartTime)} - ${preciseTime(block.displayEndTime)}`;
  }
  return chipTime(section);
}

function renderGlobalDropdown({ action, topActionMenu, topActionSurface, openTopActionMenu, closeTopActionMenu, renderShareMenu, renderDownloadMenu, renderMoreMenu }) {
  const menu = {
    share: TOP_ACTION_MENUS.share,
    download: TOP_ACTION_MENUS.download,
    more: TOP_ACTION_MENUS.more
  }[action.key];
  const content = {
    share: renderShareMenu,
    download: renderDownloadMenu,
    more: renderMoreMenu
  }[action.key];
  if (!menu || !content) return null;
  return (
    <TopActionDropdown
      activeMenu={topActionMenu}
      activeSurface={topActionSurface}
      label={action.label}
      menu={menu}
      onClose={closeTopActionMenu}
      onOpen={openTopActionMenu}
      renderTrigger={(triggerProps) => (
        <IconHintButton
          className={triggerProps.active ? "active" : ""}
          iconName={action.icon}
          label={action.label}
          onClick={triggerProps.onClick}
          pressed={triggerProps.active}
        />
      )}
      surface="mobile"
    >
      {content()}
    </TopActionDropdown>
  );
}

function StitchStage({ model, actions }) {
  const {
    activeSection,
    activeTransitionPaths,
    dragPositions,
    focusedPerformerIds,
    performers,
    readonly,
    selectedPerformerId,
    selectedPerformerIds,
    stage3dProjection,
    stageDimensions,
    stageReferences,
    stageViewMode,
    visiblePositions
  } = model;
  const selectedSet = new Set(selectedPerformerIds || []);
  const gridX = meterTicks(stageDimensions.width);
  const gridY = meterTicks(stageDimensions.height);
  const meterLabel = model.stageSizeLabel || stageMeterLabel(stageDimensions);
  const stageWidth = Math.max(1, Number(stageDimensions.width) || 1);
  const stageHeight = Math.max(1, Number(stageDimensions.height) || 1);
  const stageRatio = `${stageWidth} / ${stageHeight}`;
  const tokenMetrics = stageTokenMetrics(stageDimensions);
  const stageFrameStyle = stageWidth >= stageHeight
    ? {
      "--stitch-stage-ratio": stageRatio,
      "--stitch-stage-frame-width": "var(--stitch-stage-size)",
      "--stitch-stage-frame-height": `calc(var(--stitch-stage-size) * ${stageHeight / stageWidth})`
    }
    : {
      "--stitch-stage-ratio": stageRatio,
      "--stitch-stage-frame-width": `calc(var(--stitch-stage-size) * ${stageWidth / stageHeight})`,
      "--stitch-stage-frame-height": "var(--stitch-stage-size)"
    };

  return (
    <div className="stage-frame" style={stageFrameStyle}>
      <div className="stage-corner-tools" aria-label="무대 도구">
        <IconHintButton className="icon-tool" iconName="undo" label="되돌리기" onClick={actions.undoPlan} disabled={model.undoDisabled} />
        <IconHintButton className="icon-tool" iconName="redo" label="다시 실행" onClick={actions.redoPlan} disabled={model.redoDisabled} />
        <IconHintButton className="icon-tool active" iconName="layer" label="참조선" onClick={actions.toggleStageReferences} />
      </div>
      <div className="stage-view-float-toggle" role="group" aria-label="무대 보기">
        <button onClick={() => actions.setStageViewMode(stageViewMode === "2d" ? "3d" : "2d")}>{stageViewMode === "2d" ? "3D" : "2D"}</button>
      </div>
      <div className="stage-meter-badge" aria-label="무대 크기">{meterLabel}</div>
      {stageViewMode === "3d" ? (
        <Stage3dPreview projection={stage3dProjection} />
      ) : (
        <svg
          ref={actions.svgRef}
          className="stage"
          viewBox={stageViewBox(stageDimensions)}
          onPointerMove={actions.onStagePointerMove}
          onPointerUp={actions.finishActiveDrag}
          onPointerCancel={actions.clearDrag}
          onClick={actions.handleStageTap}
        >
          <defs>
            <marker id="stitch-arrow-live" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#b7c4ff" />
            </marker>
          </defs>
          <rect className="stitch-stage-base" x="0" y="0" width={stageDimensions.width} height={stageDimensions.height} rx="2" />
          <rect className="stitch-stage-front-zone" x="0" y={model.frontZone?.y || stageDimensions.height * 0.72} width={stageDimensions.width} height={stageDimensions.height - (model.frontZone?.y || stageDimensions.height * 0.72)} />
          <g className="stage-grid">
            {gridX.map((x) => (
              <line
                key={`x-${x}`}
                className={x % GRID_MAJOR_STEP === 0 ? "major" : "minor"}
                x1={x}
                y1="0"
                x2={x}
                y2={stageDimensions.height}
              />
            ))}
            {gridY.map((y) => (
              <line
                key={`y-${y}`}
                className={y % GRID_MAJOR_STEP === 0 ? "major" : "minor"}
                x1="0"
                y1={y}
                x2={stageDimensions.width}
                y2={y}
              />
            ))}
          </g>
          <g className="stage-reference-layer" aria-hidden="true">
            {(stageReferences || []).map((item, index) => (
              <g key={item.id || index} opacity={item.opacity ?? 0.55}>
                {item.type === "line" && <line x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} />}
                {item.type === "text" && <text x={item.x} y={item.y}>{item.label}</text>}
              </g>
            ))}
          </g>
          <g className="transition-path-layer">
            {(activeTransitionPaths || []).map((path) => (
              <line
                className="transition-path-line"
                key={`${path.context}-${path.performerId}`}
                x1={path.from.x}
                y1={path.from.y}
                x2={path.to.x}
                y2={path.to.y}
                markerEnd="url(#stitch-arrow-live)"
              />
            ))}
          </g>
          <g className="performer-layer">
            {(performers || []).map((performer) => {
              const pos = dragPositions?.[performer.id] || visiblePositions?.[performer.id];
              if (!pos) return null;
              const selected = selectedPerformerId === performer.id || selectedSet.has(performer.id);
              const focused = !focusedPerformerIds?.length || focusedPerformerIds.includes(performer.id) || selected;
              return (
                <g
                  key={performer.id}
                  className={["token", selected ? "selected" : "", dragPositions?.[performer.id] ? "dragging" : ""].filter(Boolean).join(" ")}
                  opacity={focused ? 1 : 0.28}
                  onPointerDown={(event) => actions.onStagePointerDown(event, performer.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (readonly) actions.selectPerformer?.(performer.id);
                  }}
                >
                  <title>{performer.name}</title>
                  <circle cx={pos.x} cy={pos.y} r={tokenMetrics.hitRadius} fill="transparent" />
                  {selected && <circle cx={pos.x} cy={pos.y} r={tokenMetrics.selectedRingRadius} className="stitch-token-ring" strokeWidth={tokenMetrics.strokeWidth * 1.4} />}
                  <circle cx={pos.x} cy={pos.y} r={tokenMetrics.tokenRadius} fill={performer.color || "#2e62ff"} stroke="#201f1f" strokeWidth={tokenMetrics.strokeWidth} style={{ stroke: "#201f1f", strokeWidth: tokenMetrics.strokeWidth }} />
                  <text x={pos.x} y={pos.y + tokenMetrics.labelFontSize * 0.34} textAnchor="middle" fontSize={tokenMetrics.labelFontSize}>{shortTokenName(performer.name)}</text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
      <div className="stitch-stage-caption">
        <span>{activeSection?.name || "대형 없음"}</span>
        <strong>{model.selectedStateText}</strong>
      </div>
    </div>
  );
}

function StitchTimeline({ model, actions }) {
  const pinchBridgeRef = useRef({ pointers: new Map(), zoomed: false });
  const audioLaneRef = useRef(null);
  const formationLaneRef = useRef(null);
  const {
    currentSectionId,
    hasUsableAudio,
    isPlaying,
    playheadPixel,
    readonly,
    selectedSectionId,
    selectedPerformerId,
    selectedPerformerIds,
    snapPixel,
    sortedSections,
    timelineBlockedEdge,
    timelineContentWidth,
    timelineFormationBlocks,
    timelineVisualSegments,
    timelineScrollX,
    timelineTicks,
    waveformBars
  } = model;
  const zoomPercent = Number.parseFloat(model.timelineZoomLabel) || 100;
  const visualTimelineWidth = Math.max(timelineContentWidth, Math.round(zoomPercent * 4));
  const visualFormationSegments = timelineVisualSegments?.length ? timelineVisualSegments : timelineFormationBlocks;
  function onPointerDown(event) {
    const bridge = pinchBridgeRef.current;
    bridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (bridge.pointers.size < 2) bridge.zoomed = false;
    const interactiveTarget = event.target?.closest?.(".formation-block, .formation-resize-handle, button");
    const hasSelection = selectedSectionId || selectedPerformerId || selectedPerformerIds?.length;
    if (!interactiveTarget && hasSelection) {
      actions.clearTimelineSelection?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    actions.onTimelinePointerDown(event);
  }

  function onPointerMove(event) {
    const bridge = pinchBridgeRef.current;
    if (bridge.pointers.has(event.pointerId)) {
      bridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      if (!bridge.zoomed && bridge.pointers.size >= 2) {
        const [first, second] = Array.from(bridge.pointers.values());
        const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
        if (distance > 72) {
          bridge.zoomed = true;
          actions.zoomTimelineBy(2);
        }
      }
    }
    actions.onTimelinePointerMove(event);
  }

  function onPointerUp(event) {
    const bridge = pinchBridgeRef.current;
    bridge.pointers.delete(event.pointerId);
    if (bridge.pointers.size === 0) bridge.zoomed = false;
    actions.onTimelinePointerUp(event);
  }

  useEffect(() => {
    const node = audioLaneRef.current;
    if (!node) return undefined;
    const nativeBridge = { pointers: new Map(), zoomed: false };
    function down(event) {
      nativeBridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      if (nativeBridge.pointers.size < 2) nativeBridge.zoomed = false;
    }
    function move(event) {
      if (!nativeBridge.pointers.has(event.pointerId)) return;
      nativeBridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      if (nativeBridge.zoomed || nativeBridge.pointers.size < 2) return;
      nativeBridge.zoomed = true;
      actions.zoomTimelineBy(2);
    }
    function up(event) {
      nativeBridge.pointers.delete(event.pointerId);
      if (nativeBridge.pointers.size === 0) nativeBridge.zoomed = false;
    }
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
    };
  }, [actions]);

  useEffect(() => {
    const node = formationLaneRef.current;
    if (!node) return undefined;
    function click(event) {
      const block = event.target?.closest?.(".formation-block");
      if (!block) return;
      const section = sortedSections.find((item) => item.id === block.dataset.sectionId);
      if (section) actions.onFormationSelect?.(section);
    }
    node.addEventListener("click", click);
    return () => node.removeEventListener("click", click);
  }, [actions, sortedSections]);

  function onWorkbenchClick(event) {
    const interactiveTarget = event.target?.closest?.(".formation-block, .formation-resize-handle, button");
    if (interactiveTarget) return;
    actions.clearTimelineSelection?.();
  }

  const timelineHandlers = {
    onWheel: actions.onTimelineWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp
  };
  return (
    <div className="timeline-editor" aria-label="대형 타임라인">
      <div className="timeline-control-rail">
        <div className="timeline-transport-controls" aria-label="타임라인 실행">
          <IconHintButton className="primary playback-button timeline-icon-button" iconName={isPlaying ? "pause" : "play"} label={isPlaying ? "정지" : "재생"} onClick={actions.togglePlayback} disabled={!hasUsableAudio} />
          {!readonly && (
            <>
              <IconHintButton className="timeline-icon-button" iconName="undo" label="되돌리기" onClick={actions.undoPlan} disabled={model.undoDisabled} />
              <IconHintButton className="timeline-icon-button" iconName="redo" label="앞으로가기" onClick={actions.redoPlan} disabled={model.redoDisabled} />
            </>
          )}
        </div>
        <span className="timeline-time-readout">{model.timeLabel}</span>
        <div className="timeline-zoom-controls">
          <IconHintButton className="timeline-icon-button" iconName="zoom-minus" label="타임라인 축소" onClick={() => actions.zoomTimelineBy(0.82)} />
          <span>{model.timelineZoomLabel}</span>
          <IconHintButton className="timeline-icon-button" iconName="zoom-plus" label="타임라인 확대" onClick={() => actions.zoomTimelineBy(1.18)} />
        </div>
      </div>
      <div className="timeline-workbench" onClick={onWorkbenchClick}>
        <div className="timeline-track-row ruler-row" data-track-row="ruler">
          <span className="timeline-row-label" aria-hidden="true" />
          <div ref={actions.timelineViewportRef} className="timeline-viewport timeline-ruler-viewport" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-timelineScrollX}px)` }}>
              {timelineTicks.map((tick) => <span key={tick.time} className="timeline-tick" style={{ left: `${tick.x}px` }}>{tick.label}</span>)}
              <span className="timeline-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
        <div className="timeline-track-row forms-row" data-track-row="forms">
          <span className="timeline-row-label">
            <span>Forms</span>
            {!readonly && (
              <button className="timeline-row-add-button" type="button" aria-label="대형 추가" title="대형 추가" onClick={() => actions.addSection({ forceAppend: true })}>
                +
              </button>
            )}
          </span>
          <div ref={formationLaneRef} className="timeline-viewport timeline-lane" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-timelineScrollX}px)` }}>
              {visualFormationSegments.map((block, segmentIndex) => {
                const section = block.sectionId
                  ? sortedSections.find((item) => item.id === block.sectionId)
                  : sortedSections[segmentIndex];
                if (!block || !section) return null;
                const sectionIndex = sortedSections.findIndex((item) => item.id === section.id);
                const isMove = block.kind === "move";
                const isHold = block.kind === "hold" || !block.kind;
                const canResize = block.resizable ?? (!block.isMarker && !isMove);
                const selected = !isMove && section.id === selectedSectionId;
                return (
                  <button
                    key={`${block.kind || "segment"}-${block.fromSectionId || section.id}-${block.toSectionId || section.id}-${segmentIndex}`}
                    data-section-id={section.id}
                    className={[
                      "formation-block",
                      isHold ? "hold" : "",
                      isMove ? "move" : "",
                      block.isMarker ? "marker" : "segment",
                      selected ? "selected" : "",
                      section.id === currentSectionId ? "current" : "",
                      timelineBlockedEdge?.sectionId === section.id ? `blocked-${timelineBlockedEdge.edge}` : ""
                    ].filter(Boolean).join(" ")}
                    style={{
                      "--formation-left": `${block.leftPx}px`,
                      "--formation-logical-left": `${block.logicalLeftPx ?? block.leftPx}px`,
                      "--formation-width": `${block.widthPx}px`,
                      "--formation-hit-width": `${block.hitWidthPx ?? block.widthPx}px`,
                      "--formation-arrival": `${block.arrivalPx ?? block.leftPx + block.widthPx}px`
                    }}
                    onPointerDown={(event) => {
                      actions.onFormationSelect?.(section);
                      if (isMove) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      actions.onFormationPointerDown(event, section, sectionIndex, "body");
                    }}
                    onMouseDown={() => actions.onFormationSelect?.(section)}
                    onClick={() => actions.onFormationSelect?.(section)}
                  >
                    <span>{block.label || `F${sectionIndex + 1}`}</span>
                    <strong>{isMove ? `to ${section.name}` : section.name}</strong>
                    <em>{blockTimeLabel(block, section)}</em>
                    {!readonly && canResize && selected && (
                      <span
                        className="formation-resize-handle right"
                        onPointerDown={(event) => actions.onFormationPointerDown(event, section, sectionIndex, "hold-right")}
                        aria-label="대형 Hold 끝 조정"
                      />
                    )}
                  </button>
                );
              })}
              <span className="timeline-playhead track-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline track-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
        <div className="timeline-track-row audio-row" data-track-row="audio">
          <span className="timeline-row-label">
            <span>Audio</span>
            {!readonly && (
              <button className="timeline-row-add-button" type="button" aria-label="음악 추가" title="음악 추가" onClick={actions.openAudioFilePicker}>
                +
              </button>
            )}
          </span>
          <div ref={audioLaneRef} className="timeline-viewport timeline-lane audio-lane" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-timelineScrollX}px)` }}>
              {hasUsableAudio ? (
                <div className="audio-waveform" aria-hidden="true">
                  {waveformBars.map((bar, index) => <span key={index} className="audio-bar" style={{ height: `${Math.round(bar * 100)}%` }} />)}
                </div>
              ) : (
                <span className="timeline-empty-audio">Audio</span>
              )}
              <span className="timeline-playhead track-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline track-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StitchMobileEditor({ actions, model }) {
  const globalActions = model.globalActions || [];
  return (
    <section className="stitch-mobile-editor" data-stitch-mobile-editor data-selection-state={model.selectionVisualState}>
      <header className="mobile-status-bar stitch-utility-bar">
        <div className="mobile-status-title">
          <span className="mobile-project-title">{model.projectTitle}</span>
          <span className="save-meta">{model.localSaveLabel}</span>
        </div>
        <div className="mobile-status-meta">
          <strong>{model.activeSectionName}</strong>
          <span>{model.timeLabel} · 도착 {model.arrivalLabel}</span>
        </div>
        {!model.readonly && (
          <div className="mobile-global-actions" aria-label="모바일 전역 명령">
            {globalActions.map((action) => {
              if (action.key === "save") {
                return <IconHintButton className="primary" iconName={action.icon} key={action.key} label={action.label} onClick={() => actions.handleMobileAction(action.key)} />;
              }
              return (
                <React.Fragment key={action.key}>
                  {renderGlobalDropdown({
                    action,
                    topActionMenu: model.topActionMenu,
                    topActionSurface: model.topActionSurface,
                    openTopActionMenu: actions.openTopActionMenu,
                    closeTopActionMenu: actions.closeTopActionMenu,
                    renderShareMenu: actions.renderShareMenu,
                    renderDownloadMenu: actions.renderDownloadMenu,
                    renderMoreMenu: actions.renderMoreMenu
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </header>
      <div className="stage-area" data-selection-state={model.selectionVisualState}>
        <StitchStage model={model} actions={actions} />
      </div>
      <StitchTimeline model={model} actions={actions} />
      {!model.readonly && (
        <div className="mobile-action-bar" aria-label="모바일 편집 도구">
          {(model.mobileActions || []).map((action) => (
            <IconHintButton
              className={[action.danger ? "danger-button compact-danger" : "", model.activeMobilePanelActionKey === action.key ? "active" : ""].filter(Boolean).join(" ")}
              iconName={action.icon}
              key={action.key}
              label={action.label}
              onClick={() => actions.handleMobileAction(action.key)}
              pressed={model.activeMobilePanelActionKey === action.key}
              showLabel
            />
          ))}
        </div>
      )}
      {model.isMobilePanelOpen && (
        <div className={`mobile-bottom-sheet ${model.mobilePanelSize}`}>
          <div className="bottom-sheet-head">
            <button type="button" className="bottom-sheet-handle" onClick={actions.cycleMobilePanelSize} aria-label="패널 크기 전환" title="패널 크기 전환"><span /></button>
            <strong>{model.mobilePanelTitle}</strong>
            <button className="bottom-sheet-close" onClick={actions.closeMobilePanel} aria-label="닫기" title="닫기">x</button>
          </div>
          <div className="mobile-panel">
            {actions.renderMobilePanelContent()}
          </div>
        </div>
      )}
    </section>
  );
}
