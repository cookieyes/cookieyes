"use client";

import { type RefObject, type SyntheticEvent, useEffect } from "react";

export function chain<E extends SyntheticEvent>(
  userHandler: ((e: E) => void) | undefined,
  defaultHandler: () => void,
): (e: E) => void {
  return (e) => {
    userHandler?.(e);
    if (!e.defaultPrevented) defaultHandler();
  };
}

export function useEscapeKey(enabled: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, onEscape]);
}

export function useFocusTrap(enabled: boolean, containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, containerRef]);
}
