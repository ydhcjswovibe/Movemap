import { useEffect, useRef } from "react";

export const TOP_ACTION_MENUS = Object.freeze({
  share: "share",
  download: "download",
  more: "more"
});

export default function TopActionDropdown({
  activeMenu,
  activeSurface,
  children,
  className = "",
  label,
  menu,
  onClose,
  onOpen,
  renderTrigger,
  surface
}) {
  const scopeRef = useRef(null);
  const isActive = activeMenu === menu && activeSurface === surface;

  useEffect(() => {
    if (!isActive) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function closeOnOutsidePointerDown(event) {
      if (scopeRef.current?.contains(event.target)) return;
      onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
    };
  }, [isActive, onClose]);

  const triggerProps = {
    active: isActive,
    "aria-expanded": isActive,
    "aria-haspopup": "menu",
    onClick: () => {
      if (isActive) {
        onClose();
      } else {
        onOpen(menu, surface);
      }
    },
    pressed: isActive
  };

  return (
    <div
      aria-label={`${label} ${surface === "mobile" ? "모바일" : "데스크톱"} 메뉴`}
      className={["top-action-group", "top-action-scope", className].filter(Boolean).join(" ")}
      data-surface={surface}
      ref={scopeRef}
    >
      {renderTrigger(triggerProps)}
      {isActive && children}
    </div>
  );
}
