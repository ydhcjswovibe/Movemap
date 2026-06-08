import IconHintButton from "./IconHintButton.jsx";

export default function EditorV2ActionRail({ model, actions }) {
  if (model.readonly) return null;
  return (
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
  );
}
