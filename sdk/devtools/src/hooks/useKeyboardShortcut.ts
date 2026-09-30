"use client";

import { useEffect } from "react";

/**
 * Global `Ctrl/Cmd+Shift+Y` toggles the panel; `Escape` closes it while open —
 * the documented shortcuts (AD-7). Attached to `document`, released on
 * unmount; a listener that throws never breaks the rest of the page (wrapped
 * by the caller's own effect, nothing here can throw).
 */
export function useKeyboardShortcut(open: boolean, onToggle: () => void, onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isToggleKey =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "y";
      if (isToggleKey) {
        event.preventDefault();
        onToggle();
        return;
      }
      if (open && event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle, onClose]);
}
