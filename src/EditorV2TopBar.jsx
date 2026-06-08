import { Fragment } from "react";
import IconHintButton from "./IconHintButton.jsx";
import TopActionDropdown, { TOP_ACTION_MENUS } from "./TopActionDropdown.jsx";

function renderGlobalDropdown({ action, topActionMenu, topActionSurface, openTopActionMenu, closeTopActionMenu, renderShareMenu, renderDownloadMenu, renderMoreMenu }) {
  const menu = {
    share: TOP_ACTION_MENUS.share,
    download: TOP_ACTION_MENUS.download,
    more: TOP_ACTION_MENUS.more
  }[action.key];
  const content = {
    share: renderShareMenu,
    download: renderDownloadMenu,
    more: renderMoreMenu
  }[action.key];
  if (!menu || !content) return null;
  return (
    <TopActionDropdown
      activeMenu={topActionMenu}
      activeSurface={topActionSurface}
      label={action.label}
      menu={menu}
      onClose={closeTopActionMenu}
      onOpen={openTopActionMenu}
      renderTrigger={(triggerProps) => (
        <IconHintButton
          className={triggerProps.active ? "active" : ""}
          iconName={action.icon}
          label={action.label}
          onClick={triggerProps.onClick}
          pressed={triggerProps.active}
        />
      )}
      surface="mobile"
    >
      {content()}
    </TopActionDropdown>
  );
}

export default function EditorV2TopBar({ model, actions }) {
  const globalActions = model.globalActions || [];
  return (
    <header className="mobile-status-bar stitch-utility-bar">
      <div className="mobile-status-title">
        <span className="mobile-project-title">{model.projectTitle}</span>
        <span className="save-meta">{model.localSaveLabel}</span>
      </div>
      <div className="mobile-status-meta">
        <strong>{model.activeSectionName}</strong>
        <span>{model.timeLabel} · 도착 {model.arrivalLabel}</span>
      </div>
      {!model.readonly && (
        <div className="mobile-global-actions" aria-label="모바일 전역 명령">
          {globalActions.map((action) => {
            if (action.key === "save") {
              return <IconHintButton className="primary" iconName={action.icon} key={action.key} label={action.label} onClick={() => actions.handleMobileAction(action.key)} />;
            }
            return (
              <Fragment key={action.key}>
                {renderGlobalDropdown({
                  action,
                  topActionMenu: model.topActionMenu,
                  topActionSurface: model.topActionSurface,
                  openTopActionMenu: actions.openTopActionMenu,
                  closeTopActionMenu: actions.closeTopActionMenu,
                  renderShareMenu: actions.renderShareMenu,
                  renderDownloadMenu: actions.renderDownloadMenu,
                  renderMoreMenu: actions.renderMoreMenu
                })}
              </Fragment>
            );
          })}
        </div>
      )}
    </header>
  );
}
