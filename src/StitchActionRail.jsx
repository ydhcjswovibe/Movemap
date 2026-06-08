import IconHintButton from "./IconHintButton.jsx";

export default function StitchActionRail({ model, actions }) {
  const shell = model.shell || model;
  if (shell.readonly) return null;
  return (
    <div className="mobile-action-bar stitch-action-rail" aria-label="모바일 편집 도구">
      <IconHintButton className="stitch-rail-button" iconName="select" label="복사" onClick={() => actions.handleMobileAction?.("duplicate-formation")} />
      <IconHintButton className="stitch-rail-button" iconName="redo" label="대칭" onClick={() => actions.handleMobileAction?.("mirror")} />
      <IconHintButton className="stitch-rail-button danger-button" iconName="close" label="삭제" onClick={() => actions.handleMobileAction?.("delete-formation")} />
      <IconHintButton className="stitch-rail-button active" iconName="settings" label="트랜지션" onClick={() => actions.handleMobileAction?.("formation")} pressed />
      <IconHintButton className="stitch-rail-button" iconName="more" label="더보기" onClick={() => actions.handleMobileAction?.("more")} />
    </div>
  );
}
