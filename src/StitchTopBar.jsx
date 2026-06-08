import IconHintButton from "./IconHintButton.jsx";

export default function StitchTopBar({ model, actions }) {
  const shell = model.shell || model;
  const actionModel = model.actions || {};
  const menuAction = actionModel.globalActions?.find((action) => action.key === "more");
  return (
    <header className="stitch-topbar">
      <div className="stitch-topbar-left">
        <IconHintButton className="stitch-icon-button stitch-edit-note" iconName="note" label="편집" onClick={() => actions.handleMobileAction?.("view")} />
        <div className="stitch-title-stack">
          <h1>{shell.activeSectionName || shell.projectTitle || "Finale Scene"}</h1>
          <span className="stitch-saved-chip">
            <i aria-hidden="true" />
            {shell.localSaveLabel || "Saved"}
          </span>
        </div>
      </div>
      {!shell.readonly && <IconHintButton className="stitch-icon-button" iconName={menuAction?.icon || "more"} label={menuAction?.label || "더보기"} onClick={() => actions.handleMobileAction?.(menuAction?.key || "more")} />}
    </header>
  );
}
