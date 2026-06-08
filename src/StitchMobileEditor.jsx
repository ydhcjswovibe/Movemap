import StitchActionRail from "./StitchActionRail.jsx";
import StitchInspector from "./StitchInspector.jsx";
import StitchStage from "./StitchStage.jsx";
import StitchTimeline from "./StitchTimeline.jsx";
import StitchTopBar from "./StitchTopBar.jsx";

export default function StitchMobileEditor({ actions, model }) {
  const selection = model.selection || model;
  const selectionVisualState = selection.selectionVisualState;
  return (
    <section
      className="stitch-mobile-editor"
      data-stitch-mobile-editor
      data-selection-state={selectionVisualState}
    >
      <StitchTopBar model={model} actions={actions} />
      <div className="stage-area" data-selection-state={selectionVisualState}>
        <StitchStage model={model} actions={actions} />
      </div>
      <StitchTimeline model={model} actions={actions} />
      <StitchActionRail model={model} actions={actions} />
      <StitchInspector model={model} actions={actions} />
    </section>
  );
}
