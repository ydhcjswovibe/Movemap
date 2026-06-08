import IconHintButton from "./IconHintButton.jsx";

function shortTokenName(name = "") {
  return name.trim().slice(0, 2).toUpperCase();
}

function percentPosition(pos = {}, dimensions = {}) {
  const width = Math.max(1, Number(dimensions.width) || 1);
  const height = Math.max(1, Number(dimensions.height) || 1);
  return {
    left: `${Math.max(0, Math.min(100, (Number(pos.x) / width) * 100))}%`,
    top: `${Math.max(0, Math.min(100, (Number(pos.y) / height) * 100))}%`
  };
}

function performerTone(performer = {}, selected = false) {
  const name = String(performer.name || performer.id || "");
  if (name.toUpperCase().startsWith("B")) return selected ? "rose selected" : "rose";
  return selected ? "blue selected" : "blue";
}

export default function StitchStage({ model, actions }) {
  const shell = model.shell || model;
  const stage = model.stage || model;
  const selection = model.selection || model;
  const {
    activeTransitionPaths,
    dragPositions,
    focusedPerformerIds,
    performers,
    stageDimensions,
    visiblePositions
  } = stage;
  const selectedSet = new Set(selection.selectedPerformerIds || []);

  return (
    <div
      className="stage-frame stitch-stage-frame"
      onPointerMove={actions.onStagePointerMove}
      onPointerUp={actions.finishActiveDrag}
      onPointerCancel={actions.clearDrag}
      onClick={actions.handleStageTap}
    >
      <div className="stage stitch-stage-canvas">
        <div className="stitch-front-zone" aria-hidden="true" />
        <div className="stage-grid stitch-stage-grid" aria-hidden="true" />
        <div className="stage-reference-layer stitch-axis-layer" aria-hidden="true">
          <span className="stitch-axis-x" />
          <span className="stitch-axis-y" />
          <span className="stitch-center-mark" />
        </div>
        <svg className="stitch-path-layer" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
          {(activeTransitionPaths || []).slice(0, 8).map((path) => {
            const from = percentPosition(path.from, stageDimensions);
            const to = percentPosition(path.to, stageDimensions);
            return (
              <line
                key={`${path.context}-${path.performerId}`}
                x1={from.left.replace("%", "")}
                y1={from.top.replace("%", "")}
                x2={to.left.replace("%", "")}
                y2={to.top.replace("%", "")}
              />
            );
          })}
        </svg>
        {(performers || []).map((performer) => {
          const pos = dragPositions?.[performer.id] || visiblePositions?.[performer.id];
          if (!pos) return null;
          const selected = selection.selectedPerformerId === performer.id || selectedSet.has(performer.id);
          const focused = !focusedPerformerIds?.length || focusedPerformerIds.includes(performer.id) || selected;
          const style = percentPosition(pos, stageDimensions);
          return (
            <button
              className={["token stitch-performer-node", performerTone(performer, selected), dragPositions?.[performer.id] ? "dragging" : ""].filter(Boolean).join(" ")}
              key={performer.id}
              onPointerDown={(event) => actions.onStagePointerDown(event, performer.id)}
              onClick={(event) => {
                event.stopPropagation();
                if (shell.readonly) actions.selectPerformer?.(performer.id);
              }}
              style={{ ...style, opacity: focused ? 1 : 0.28 }}
              type="button"
            >
              <span>{shortTokenName(performer.name)}</span>
            </button>
          );
        })}
        <span className="stitch-audience-label">관객</span>
        <div className="stitch-stage-zoom-rail" aria-label="무대 확대 도구">
          <IconHintButton className="stitch-zoom-button" iconName="zoom-plus" label="무대 확대" onClick={() => actions.zoomTimelineBy?.(1.12)} />
          <IconHintButton className="stitch-zoom-button" iconName="zoom-minus" label="무대 축소" onClick={() => actions.zoomTimelineBy?.(0.88)} />
          <IconHintButton className="stitch-zoom-button" iconName="expand" label="무대 중앙" onClick={() => actions.setStageViewMode?.("2d")} />
        </div>
      </div>
    </div>
  );
}
