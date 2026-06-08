export default function EditorV2Inspector({ model, actions }) {
  if (!model.isMobilePanelOpen) return null;
  return (
    <div className={`mobile-bottom-sheet ${model.mobilePanelSize}`}>
      <div className="bottom-sheet-head">
        <button type="button" className="bottom-sheet-handle" onClick={actions.cycleMobilePanelSize} aria-label="패널 크기 전환" title="패널 크기 전환"><span /></button>
        <strong>{model.mobilePanelTitle}</strong>
        <button className="bottom-sheet-close" onClick={actions.closeMobilePanel} aria-label="닫기" title="닫기">x</button>
      </div>
      <div className="mobile-panel">
        {actions.renderMobilePanelContent()}
      </div>
    </div>
  );
}
