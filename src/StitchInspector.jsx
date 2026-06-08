import { Fragment } from "react";
import IconHintButton from "./IconHintButton.jsx";

function RuntimePanel({ panel, actions }) {
  return (
    <div className="mobile-panel-stack">
      {(panel.sections || []).map((section) => (
        <div className="mobile-selection-grid" key={section.key}>
          {(section.items || []).map((item) => (
            <Fragment key={`${section.key}-${item.label}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </Fragment>
          ))}
        </div>
      ))}
      {Boolean(panel.actions?.length) && (
        <div className="mobile-command-grid compact">
          {panel.actions.map((action) => (
            <IconHintButton
              className={action.danger ? "danger-button compact-danger" : ""}
              disabled={action.disabled}
              iconName={action.icon}
              key={action.key}
              label={action.label}
              onClick={() => actions.handleInspectorAction(action)}
              showLabel
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StitchInspector({ model, actions }) {
  const inspector = model.inspector || {};
  const isOpen = inspector.isOpen ?? model.isMobilePanelOpen;
  if (!isOpen) return null;
  const panel = inspector.currentPanel;
  const title = inspector.title || model.mobilePanelTitle;
  const size = inspector.mobilePanelSize || model.mobilePanelSize;
  return (
    <div className={`mobile-bottom-sheet ${size}`}>
      <div className="bottom-sheet-head">
        <button type="button" className="bottom-sheet-handle" onClick={actions.cycleMobilePanelSize} aria-label="패널 크기 전환" title="패널 크기 전환"><span /></button>
        <strong>{title}</strong>
        <button className="bottom-sheet-close" onClick={actions.closeMobilePanel} aria-label="닫기" title="닫기">x</button>
      </div>
      <div className="mobile-panel">
        {panel && !panel.fallback ? (
          <RuntimePanel panel={panel} actions={actions} />
        ) : (
          actions.renderMobilePanelContent()
        )}
      </div>
    </div>
  );
}
