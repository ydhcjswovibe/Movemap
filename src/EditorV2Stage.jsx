import Stage3dPreview from "./Stage3dPreview.jsx";
import IconHintButton from "./IconHintButton.jsx";
import { stageViewBox } from "./stageGeometry.mjs";
import { stageTokenMetrics } from "./stageVisualMetrics.mjs";

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

export default function EditorV2Stage({ model, actions }) {
  const shell = model.shell || model;
  const stage = model.stage || model;
  const selection = model.selection || model;
  const actionModel = model.actions || model;
  const {
    activeSection,
    activeTransitionPaths,
    dragPositions,
    focusedPerformerIds,
    performers,
    stage3dProjection,
    stageDimensions,
    stageReferences,
    stageViewMode,
    visiblePositions
  } = stage;
  const { readonly } = shell;
  const {
    selectedPerformerId,
    selectedPerformerIds,
    selectedStateText
  } = selection;
  const selectedSet = new Set(selectedPerformerIds || []);
  const gridX = meterTicks(stageDimensions.width);
  const gridY = meterTicks(stageDimensions.height);
  const meterLabel = stage.stageSizeLabel || stageMeterLabel(stageDimensions);
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
        <IconHintButton className="icon-tool" iconName="undo" label="되돌리기" onClick={actions.undoPlan} disabled={actionModel.undoDisabled} />
        <IconHintButton className="icon-tool" iconName="redo" label="다시 실행" onClick={actions.redoPlan} disabled={actionModel.redoDisabled} />
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
          <rect className="stitch-stage-front-zone" x="0" y={stage.frontZone?.y || stageDimensions.height * 0.72} width={stageDimensions.width} height={stageDimensions.height - (stage.frontZone?.y || stageDimensions.height * 0.72)} />
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
        <strong>{selectedStateText}</strong>
      </div>
    </div>
  );
}
