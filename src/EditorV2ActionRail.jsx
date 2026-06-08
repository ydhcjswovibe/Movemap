import IconHintButton from "./IconHintButton.jsx";

export default function EditorV2ActionRail({ model, actions }) {
  const shell = model.shell || model;
  const actionModel = model.actions || model;
  const inspector = model.inspector || model;
  if (shell.readonly) return null;
  return (
    <div className="mobile-action-bar" aria-label="모바일 편집 도구">
      {(actionModel.mobileActions || []).map((action) => (
        <IconHintButton
          className={[action.danger ? "danger-button compact-danger" : "", inspector.activeMobilePanelActionKey === action.key ? "active" : ""].filter(Boolean).join(" ")}
          iconName={action.icon}
          key={action.key}
          label={action.label}
          onClick={() => actions.handleMobileAction(action.key)}
          pressed={inspector.activeMobilePanelActionKey === action.key}
          showLabel
        />
      ))}
    </div>
  );
}
