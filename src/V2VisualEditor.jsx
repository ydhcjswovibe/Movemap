import React, { useRef } from "react";
import CoolIcon from "./icons/CoolIcon.jsx";
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

function bottomActions(capabilities = {}) {
  return [
    { icon: "timer-add", label: "대형 추가", primary: true, action: "add-formation", disabled: !capabilities.canAddFormation },
    { icon: "undo", label: "실행 취소", action: "undo", disabled: !capabilities.canUndo },
    { icon: "redo", label: "다시 실행", action: "redo", disabled: !capabilities.canRedo },
    { icon: "select", label: "복제", action: "duplicate", disabled: !capabilities.canDuplicate },
    { icon: "close", label: "삭제", action: "delete", disabled: !capabilities.canDelete },
    { icon: "more", label: "더보기", action: "more", disabled: false }
  ];
}

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
        frontZone: { y: 69 }
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
    sections: model.timeline.sortedSections || model.sortedSections || model.sections || []
  };
}

function IconButton({ icon, label, className = "", primary = false, onClick, disabled = false }) {
  return (
    <button
      className={`v2-icon-button ${primary ? "is-primary" : ""} ${className}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      <CoolIcon name={icon} />
    </button>
  );
}

function V2VisualEditor({ model, actions = {} }) {
  const stageSurfaceRef = useRef(null);
  const tokenGestureRef = useRef(null);
  const suppressNextTokenClickRef = useRef(false);
  const view = buildDemoViewModel(model);
  const { shell, stage, selection, timeline, sections } = view;
  const runtimeActions = { ...(view.actions || {}), ...actions };
  const capabilities = view.capabilities || {};
  const stageDimensions = stage.stageDimensions || { width: 100, height: 100 };
  const stageWidth = Math.max(1, Number(stageDimensions.width) || 100);
  const stageHeight = Math.max(1, Number(stageDimensions.height) || 100);
  const selectedPerformerIds = new Set(selection.selectedPerformerIds || []);
  const selectedSectionId = selection.selectedSectionId || selection.selectedSection?.id || "";
  const currentSectionId = timeline.currentSectionId || "";
  const timelineContentWidth = Math.max(320, Number(timeline.timelineContentWidth ?? timeline.contentWidth) || 320);
  const timelineScrollX = Math.max(0, Number(timeline.timelineScrollX ?? timeline.scrollX) || 0);
  const playheadLeft = Math.max(0, Number(timeline.playheadPixel) || 0);
  const visualSegments = (timeline.holdMoveSegments?.length ? timeline.holdMoveSegments : timeline.timelineVisualSegments)?.length ? (timeline.holdMoveSegments?.length ? timeline.holdMoveSegments : timeline.timelineVisualSegments) : demoTimelineSegments;
  const waveformSamples = timeline.waveformBars?.length ? timeline.waveformBars.slice(0, 96) : demoWaveformSamples;
  const timelineContentStyle = {
    width: `${timelineContentWidth}px`,
    transform: `translateX(${-timelineScrollX}px)`
  };

  return (
    <main className="v2-visual-editor" data-v2-visual-editor>
      <section className="v2-phone-shell" aria-label="Movemap Pro Editor">
        <header className="v2-topbar">
          <IconButton icon="grid" label="편집 메뉴" className="v2-brand-mark" />
          <div className="v2-title-cluster">
            <h1>{shell.projectTitle || shell.title || "Movemap"}</h1>
            <span className="v2-saved-chip">
              <span aria-hidden="true" />
              {normalizeSaveLabel(shell.localSaveLabel ?? shell.saveLabel)}
            </span>
          </div>
          <IconButton icon="more" label="더보기" onClick={() => runtimeActions.more?.("more")} />
        </header>

        <section className="v2-stage-wrap" data-v2-stage aria-label="Stage">
          <div
            className="v2-stage-surface"
            ref={stageSurfaceRef}
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
            <div className="v2-stage-crosshair" aria-hidden="true" />
            <div className="v2-center-diamond" aria-hidden="true" />
            <div
              className="v2-audience-zone"
              style={{ "--front-zone-y": `${clampPercent(((stage.frontZone?.y ?? stageHeight * 0.69) / stageHeight) * 100)}%` }}
            >
              <span>관객</span>
            </div>

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

            <div className="v2-zoom-rail" aria-label="Stage zoom controls">
              <IconButton icon="add" label="확대" />
              <IconButton icon="zoom-minus" label="축소" />
              <IconButton icon="expand" label="중앙 맞춤" />
            </div>
          </div>
        </section>

        <section className="v2-transport" aria-label="Playback controls">
          <IconButton icon={timeline.isPlaying ? "pause" : "play"} label={timeline.isPlaying ? "정지" : "재생"} className="v2-play-button" onClick={runtimeActions.play} />
          <div className="v2-timecode" aria-label="Current timecode">{preciseTimeLabel(shell.timeLabel)}</div>
          <div className="v2-transport-spacer" aria-hidden="true" />
          <IconButton icon="settings" label="타임라인 설정" onClick={() => runtimeActions.more?.("view")} />
        </section>

        <section className="v2-timeline" data-v2-timeline aria-label="Formation timeline" onWheel={runtimeActions.timelineWheel}>
          <div className="v2-ruler">
            <div className="v2-timeline-viewport">
              <div className="v2-timeline-content" style={timelineContentStyle}>
                {(timeline.timelineTicks?.length ? timeline.timelineTicks : view.timeline.timelineTicks || []).map((tick, index) => (
                  <span
                    key={`${tick.label}-${tick.time ?? index}`}
                    style={tickStyle(tick, index)}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
              <span className="v2-playhead v2-playhead-ruler" data-v2-playhead="ruler" style={{ "--playhead-left": `${playheadLeft}px` }} aria-hidden="true" />
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
                ref={model?.timelineViewportRef || null}
                onPointerDown={runtimeActions.timelinePointerDown}
                onPointerMove={runtimeActions.timelinePointerMove}
                onPointerUp={runtimeActions.timelinePointerUp}
                onPointerCancel={runtimeActions.timelinePointerUp}
              >
                <div className="v2-timeline-content" style={timelineContentStyle}>
                  {visualSegments.map((segment, index) => {
                    const targetSectionId = segment.toSectionId || segment.sectionId || "";
                    const section = sections.find((item) => item.id === targetSectionId) || sections[index] || {};
                    const isMove = segment.kind === "move";
                    const sectionSelected = !isMove && section.id && section.id === selectedSectionId;
                    const sectionCurrent = section.id && section.id === currentSectionId;
                    return (
                      <button
                        key={`${segment.kind || "hold"}-${segment.fromSectionId || section.id || index}-${segment.toSectionId || section.id || index}-${index}`}
                        className={[
                          isMove ? "v2-move-block" : "v2-formation-block",
                          sectionSelected ? "is-selected" : "",
                          sectionCurrent ? "is-current" : ""
                        ].filter(Boolean).join(" ")}
                        data-v2-formation-block={section.id || segment.sectionId || ""}
                        data-v2-segment-kind={segment.kind || "hold"}
                        style={timelineStyle(segment.leftPx, segment.widthPx)}
                        type="button"
                        aria-label={isMove ? "Move transition" : `${section.name || segment.label || "Formation"} formation`}
                        aria-pressed={sectionSelected}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => {
                          if (section.id) runtimeActions.selectFormation?.(section);
                        }}
                      >
                        {isMove ? "Move" : section.name || segment.label}
                      </button>
                    );
                  })}
                </div>
                <span className="v2-track-playhead" data-v2-playhead="formation" style={{ "--playhead-left": `${playheadLeft}px` }} aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="v2-audio-row" aria-label="Audio reference lane">
            <div className="v2-audio-tools">
              <CoolIcon name="note" />
              {capabilities.canAddAudio && <button className="v2-track-add-button" type="button" aria-label="음악 추가" onClick={runtimeActions.addAudio}>+</button>}
            </div>
            <div className="v2-waveform" aria-hidden="true" data-v2-waveform>
              <div className="v2-timeline-viewport">
                <div className="v2-timeline-content v2-waveform-content" style={timelineContentStyle}>
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
                <span className="v2-track-playhead" data-v2-playhead="audio" style={{ "--playhead-left": `${playheadLeft}px` }} aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <nav className="v2-bottom-rail" data-v2-bottom-rail aria-label="Selected item actions">
          {bottomActions(capabilities).map((action) => (
            <IconButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              primary={action.primary}
              disabled={Boolean(action.disabled)}
              onClick={() => {
                if (action.disabled) return;
                if (action.action === "add-formation") runtimeActions.addFormation?.({ forceAppend: true });
                if (action.action === "undo") runtimeActions.undo?.();
                if (action.action === "redo") runtimeActions.redo?.();
                if (action.action === "duplicate") runtimeActions.duplicate?.();
                if (action.action === "delete") runtimeActions.delete?.();
                if (action.action === "more") runtimeActions.more?.("more");
              }}
            />
          ))}
        </nav>
      </section>
    </main>
  );
}

export default V2VisualEditor;
