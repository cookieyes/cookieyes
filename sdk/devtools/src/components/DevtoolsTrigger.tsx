"use client";

import { type PointerEvent, useRef } from "react";
import type { DevtoolsPosition } from "../types.js";
import { CookieYesMark } from "./CookieYesMark.js";

export type DevtoolsTriggerProps = {
  position: DevtoolsPosition;
  open: boolean;
  onToggle: () => void;
  hasForcedRegion: boolean;
  panelId: string;
  /** Drag-to-snap: called with the corner nearest to where the trigger was dropped. */
  onPositionChange?: ((position: DevtoolsPosition) => void) | undefined;
};

/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;

function nearestCorner(x: number, y: number): DevtoolsPosition {
  const vertical = y < window.innerHeight / 2 ? "top" : "bottom";
  const horizontal = x < window.innerWidth / 2 ? "left" : "right";
  return `${vertical}-${horizontal}`;
}

/**
 * Floating trigger button, fixed to one corner. Drag it anywhere and it snaps
 * to the nearest corner on release (the drag follows the pointer through the
 * CSSOM `translate` property, not a `style` attribute, so a strict style-src
 * CSP is unaffected). A drag never counts as a click. No state of its own
 * beyond the in-flight drag.
 */
export function DevtoolsTrigger({
  position,
  open,
  onToggle,
  hasForcedRegion,
  panelId,
  onPositionChange,
}: DevtoolsTriggerProps) {
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!onPositionChange || event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    event.currentTarget.classList.add("cyd-trigger-dragging");
    event.currentTarget.style.translate = `${dx}px ${dy}px`;
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    const el = event.currentTarget;
    el.classList.remove("cyd-trigger-dragging");
    el.style.translate = "";
    if (!d.moved) return;
    suppressClick.current = true;
    const next = nearestCorner(event.clientX, event.clientY);
    if (next !== position) onPositionChange?.(next);
  }

  return (
    <button
      type="button"
      className={`cyd-trigger cyd-pos-${position}${open ? " cyd-trigger-open" : ""}`}
      data-cyd-part="trigger"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? "Close CookieYes devtools" : "Open CookieYes devtools"}
      title="CookieYes devtools (drag to move)"
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onToggle();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <CookieYesMark className="cyd-trigger-mark" withBackdrop />
      {hasForcedRegion ? (
        <span
          className="cyd-trigger-badge"
          data-cyd-part="trigger-forced-badge"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
