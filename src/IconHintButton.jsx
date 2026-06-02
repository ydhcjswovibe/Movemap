import React, { memo, useEffect, useRef, useState } from "react";
import CoolIcon from "./icons/CoolIcon.jsx";

const HINT_EVENT = "movemap:icon-hint";
const HINT_LIFETIME_MS = 1800;
const HOVER_DELAY_MS = 160;
const EDGE_MARGIN = 12;
const HINT_HALF_WIDTH = 80;

function clampHintLeft(left) {
  if (typeof window === "undefined") return left;
  const min = EDGE_MARGIN + HINT_HALF_WIDTH;
  const max = Math.max(min, window.innerWidth - EDGE_MARGIN - HINT_HALF_WIDTH);
  return Math.min(max, Math.max(min, left));
}

function hintPlacementFor(target) {
  const rect = target?.getBoundingClientRect?.();
  if (!rect) {
    return {
      left: typeof window === "undefined" ? HINT_HALF_WIDTH : window.innerWidth / 2,
      top: 16,
      placement: "below"
    };
  }
  const showBelow = rect.top < 36;
  return {
    left: clampHintLeft(rect.left + rect.width / 2),
    top: showBelow ? rect.bottom + 8 : rect.top - 8,
    placement: showBelow ? "below" : "above"
  };
}

function emitIconHint(id, label, target) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HINT_EVENT, {
    detail: {
      id,
      label,
      ...hintPlacementFor(target)
    }
  }));
}

function IconHintButton({
  as: ControlTag = "button",
  className = "",
  disabled = false,
  iconName,
  label,
  onClick,
  children,
  pressed,
  showLabel = false,
  type = "button"
}) {
  const hoverTimerRef = useRef(null);
  const hintId = `${iconName || "control"}:${label}`;
  const isButton = ControlTag === "button";

  useEffect(() => () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
  }, []);

  function clearScheduledHint() {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function scheduleHint(target) {
    clearScheduledHint();
    hoverTimerRef.current = window.setTimeout(() => {
      emitIconHint(hintId, label, target);
      hoverTimerRef.current = null;
    }, HOVER_DELAY_MS);
  }

  const controlProps = {
    className,
    title: label,
    "aria-label": label,
    onClick: (event) => {
      if (disabled) return;
      clearScheduledHint();
      onClick?.(event);
      emitIconHint(hintId, label, event.currentTarget);
    },
    onFocus: (event) => {
      if (!disabled) scheduleHint(event.currentTarget);
    },
    onBlur: clearScheduledHint,
    onPointerEnter: (event) => {
      if (!disabled && event.pointerType === "mouse") {
        scheduleHint(event.currentTarget);
      }
    },
    onPointerLeave: clearScheduledHint
  };
  if (isButton) {
    controlProps.type = type;
    controlProps.disabled = disabled;
  } else if (disabled) {
    controlProps["aria-disabled"] = "true";
  }
  if (typeof pressed === "boolean") {
    controlProps["aria-pressed"] = pressed;
  }

  return (
    <span className="icon-hint-wrapper">
      <ControlTag {...controlProps}>
        {iconName && <CoolIcon name={iconName} />}
        {showLabel && <span>{label}</span>}
        {children}
      </ControlTag>
    </span>
  );
}

function IconHintOverlay() {
  const [hint, setHint] = useState(null);

  useEffect(() => {
    function onHint(event) {
      setHint(event.detail);
    }
    window.addEventListener(HINT_EVENT, onHint);
    return () => window.removeEventListener(HINT_EVENT, onHint);
  }, []);

  useEffect(() => {
    if (!hint) return undefined;
    const timer = window.setTimeout(() => setHint(null), HINT_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  if (!hint) return null;

  return (
    <span
      className={`icon-hint-popover ${hint.placement}`}
      style={{
        "--icon-hint-left": `${hint.left}px`,
        "--icon-hint-top": `${hint.top}px`
      }}
    >
      {hint.label}
    </span>
  );
}

export { IconHintOverlay };
export default memo(IconHintButton);
