import EditorV2ActionRail from "./EditorV2ActionRail.jsx";
import EditorV2Inspector from "./EditorV2Inspector.jsx";
import EditorV2Stage from "./EditorV2Stage.jsx";
import EditorV2Timeline from "./EditorV2Timeline.jsx";
import EditorV2TopBar from "./EditorV2TopBar.jsx";

export default function StitchMobileEditor({ actions, model, variant = "mobile" }) {
  const isEditorV2 = variant === "editor-v2";
  const selection = model.selection || model;
  const selectionVisualState = selection.selectionVisualState;
  return (
    <section
      className={["stitch-mobile-editor", isEditorV2 ? "editor-v2" : ""].filter(Boolean).join(" ")}
      data-editor-v2={isEditorV2 ? "true" : undefined}
      data-stitch-mobile-editor
      data-selection-state={selectionVisualState}
    >
      <EditorV2TopBar model={model} actions={actions} />
      <div className="stage-area" data-selection-state={selectionVisualState}>
        <EditorV2Stage model={model} actions={actions} />
      </div>
      <EditorV2Timeline model={model} actions={actions} />
      <EditorV2ActionRail model={model} actions={actions} />
      <EditorV2Inspector model={model} actions={actions} />
    </section>
  );
}
