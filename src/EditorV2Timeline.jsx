import { useEffect, useRef } from "react";
import IconHintButton from "./IconHintButton.jsx";

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

export default function EditorV2Timeline({ model, actions }) {
  const pinchBridgeRef = useRef({ pointers: new Map(), zoomed: false });
  const audioLaneRef = useRef(null);
  const formationLaneRef = useRef(null);
  const shell = model.shell || model;
  const selection = model.selection || model;
  const timeline = model.timeline || model;
  const actionModel = model.actions || model;
  const {
    currentSectionId,
    hasUsableAudio,
    isPlaying,
    playheadPixel,
    snapPixel,
    sortedSections,
    timelineBlockedEdge,
    timelineContentWidth,
    timelineFormationBlocks,
    timelineVisualSegments,
    timelineScrollX,
    timelineTicks,
    waveformBars
  } = timeline;
  const {
    selectedPerformerId,
    selectedPerformerIds,
    selectedSectionId
  } = selection;
  const { readonly, timeLabel } = shell;
  const zoomPercent = Number.parseFloat(timeline.timelineZoomLabel) || 100;
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
              <IconHintButton className="timeline-icon-button" iconName="undo" label="되돌리기" onClick={actions.undoPlan} disabled={actionModel.undoDisabled} />
              <IconHintButton className="timeline-icon-button" iconName="redo" label="앞으로가기" onClick={actions.redoPlan} disabled={actionModel.redoDisabled} />
            </>
          )}
        </div>
        <span className="timeline-time-readout">{timeLabel}</span>
        <div className="timeline-zoom-controls">
          <IconHintButton className="timeline-icon-button" iconName="zoom-minus" label="타임라인 축소" onClick={() => actions.zoomTimelineBy(0.82)} />
          <span>{timeline.timelineZoomLabel}</span>
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
