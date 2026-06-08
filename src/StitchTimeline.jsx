import { useEffect, useRef } from "react";
import IconHintButton from "./IconHintButton.jsx";

function preciseTime(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600).toString().padStart(2, "0");
  const minsValue = Math.floor((value % 3600) / 60);
  const mins = minsValue.toString().padStart(2, "0");
  const secs = Math.floor(value % 60).toString().padStart(2, "0");
  const frames = Math.round((value % 1) * 100).toString().padStart(2, "0");
  return { hours, mins, secs, frames };
}

export default function StitchTimeline({ model, actions }) {
  const pinchBridgeRef = useRef({ pointers: new Map(), zoomed: false });
  const formationLaneRef = useRef(null);
  const timeline = model.timeline || model;
  const selection = model.selection || model;
  const shell = model.shell || model;
  const actionModel = model.actions || {};
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
  const visualTimelineWidth = Math.max(Number(timelineContentWidth) || 0, 520);
  const visualFormationSegments = timelineVisualSegments?.length ? timelineVisualSegments : timelineFormationBlocks;
  const timeParts = preciseTime(shell.currentTime ?? shell.time ?? 74.23);
  const scrollX = Number(timelineScrollX) || 0;
  const sections = sortedSections || [];

  function onPointerDown(event) {
    const bridge = pinchBridgeRef.current;
    bridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (bridge.pointers.size < 2) bridge.zoomed = false;
    const interactiveTarget = event.target?.closest?.(".formation-block, .formation-resize-handle, button");
    const hasSelection = selection.selectedSectionId || selection.selectedPerformerId || selection.selectedPerformerIds?.length;
    if (!interactiveTarget && hasSelection) {
      actions.clearTimelineSelection?.();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    actions.onTimelinePointerDown?.(event);
  }

  function onPointerMove(event) {
    const bridge = pinchBridgeRef.current;
    if (bridge.pointers.has(event.pointerId)) {
      bridge.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      if (!bridge.zoomed && bridge.pointers.size >= 2) {
        bridge.zoomed = true;
        actions.zoomTimelineBy?.(2);
      }
    }
    actions.onTimelinePointerMove?.(event);
  }

  function onPointerUp(event) {
    pinchBridgeRef.current.pointers.delete(event.pointerId);
    actions.onTimelinePointerUp?.(event);
  }

  useEffect(() => {
    const node = formationLaneRef.current;
    if (!node) return undefined;
    function click(event) {
      const block = event.target?.closest?.(".formation-block");
      if (!block) return;
      const section = sections.find((item) => item.id === block.dataset.sectionId);
      if (section) actions.onFormationSelect?.(section);
    }
    node.addEventListener("click", click);
    return () => node.removeEventListener("click", click);
  }, [actions, sections]);

  const timelineHandlers = {
    onWheel: actions.onTimelineWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp
  };

  return (
    <div className="timeline-editor stitch-timeline-editor" aria-label="대형 타임라인">
      <div className="timeline-control-rail stitch-timeline-header">
        <div className="timeline-transport-controls">
          <IconHintButton className="stitch-square-button" iconName={isPlaying ? "pause" : "play"} label={isPlaying ? "정지" : "재생"} onClick={actions.togglePlayback} disabled={!hasUsableAudio} />
          <span className="timeline-time-readout stitch-timecode">
            <b>{timeParts.hours}</b><i>:</i><b>{timeParts.mins}</b><i>:</i><b>{timeParts.secs}</b><small>.{timeParts.frames}</small>
          </span>
          <span className="stitch-undo-redo">
            <IconHintButton className="stitch-mini-button" iconName="undo" label="되돌리기" onClick={actions.undoPlan} disabled={actionModel.undoDisabled} />
            <IconHintButton className="stitch-mini-button" iconName="redo" label="다시 실행" onClick={actions.redoPlan} disabled={actionModel.redoDisabled} />
          </span>
        </div>
        <IconHintButton className="stitch-square-button" iconName="settings" label="타임라인 설정" onClick={() => actions.handleMobileAction?.("view")} />
      </div>
      <div className="timeline-workbench stitch-timeline-workbench">
        <div className="timeline-track-row ruler-row stitch-ruler-row" data-track-row="ruler">
          <span className="timeline-row-label" aria-hidden="true" />
          <div ref={actions.timelineViewportRef} className="timeline-viewport timeline-ruler-viewport" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-scrollX}px)` }}>
              {(timelineTicks || []).map((tick) => <span key={tick.time} className="timeline-tick" style={{ left: `${tick.x}px` }}>{tick.label}</span>)}
              <span className="timeline-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
        <div className="timeline-track-row forms-row stitch-track-row" data-track-row="forms">
          <span className="timeline-row-label">
            <span>대형</span>
            {!shell.readonly && <button className="timeline-row-add-button" type="button" aria-label="대형 추가" onClick={() => actions.addSection?.({ forceAppend: true })}>+</button>}
          </span>
          <div ref={formationLaneRef} className="timeline-viewport timeline-lane" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-scrollX}px)` }}>
              {(visualFormationSegments || []).map((block, segmentIndex) => {
                const section = block.sectionId ? sections.find((item) => item.id === block.sectionId) : sections[segmentIndex];
                if (!block || !section) return null;
                const isMove = block.kind === "move";
                const selected = !isMove && section.id === selection.selectedSectionId;
                return (
                  <button
                    className={[
                      "formation-block",
                      isMove ? "move" : "hold",
                      selected ? "selected" : "",
                      section.id === currentSectionId ? "current" : "",
                      timelineBlockedEdge?.sectionId === section.id ? `blocked-${timelineBlockedEdge.edge}` : ""
                    ].filter(Boolean).join(" ")}
                    data-section-id={section.id}
                    key={`${block.kind || "segment"}-${block.fromSectionId || section.id}-${block.toSectionId || section.id}-${segmentIndex}`}
                    onClick={() => actions.onFormationSelect?.(section)}
                    onPointerDown={(event) => {
                      actions.onFormationSelect?.(section);
                      if (!isMove) actions.onFormationPointerDown?.(event, section, sections.indexOf(section), "body");
                    }}
                    style={{
                      "--formation-left": `${block.leftPx}px`,
                      "--formation-width": `${block.widthPx}px`,
                      "--formation-hit-width": `${block.hitWidthPx ?? block.widthPx}px`
                    }}
                  >
                    <span>{isMove ? "MOVE" : section.name}</span>
                    {!shell.readonly && selected && !isMove && (
                      <span className="formation-resize-handle right" onPointerDown={(event) => actions.onFormationPointerDown?.(event, section, sections.indexOf(section), "hold-right")} aria-label="대형 Hold 끝 조정" />
                    )}
                  </button>
                );
              })}
              <span className="timeline-playhead track-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline track-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
        <div className="timeline-track-row audio-row stitch-track-row" data-track-row="audio">
          <span className="timeline-row-label">
            <span>오디오</span>
            {!shell.readonly && <button className="timeline-row-add-button" type="button" aria-label="음악 추가" onClick={actions.openAudioFilePicker}>+</button>}
          </span>
          <div className="timeline-viewport timeline-lane audio-lane" {...timelineHandlers}>
            <div className="timeline-content" style={{ width: `${visualTimelineWidth}px`, transform: `translateX(${-scrollX}px)` }}>
              <div className="audio-waveform" aria-hidden="true">
                {(waveformBars?.length ? waveformBars : [0.3, 0.7, 0.45, 0.82, 0.34, 0.62, 0.28, 0.9, 0.38, 0.7, 0.42, 0.58]).map((bar, index) => (
                  <span key={index} className="audio-bar" style={{ height: `${Math.round(bar * 100)}%` }} />
                ))}
              </div>
              <span className="timeline-playhead track-playhead" style={{ left: `${playheadPixel}px` }} />
              {snapPixel !== null && <span className="timeline-snapline track-snapline" style={{ left: `${snapPixel}px` }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
