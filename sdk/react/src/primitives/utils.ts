"use client";

import { bodyPortalRoot, closeOnEscape, focusDialog, trapFocus } from "@cookieyes/ui";
import {
  type CSSProperties,
  type Ref,
  type RefObject,
  type SyntheticEvent,
  useEffect,
  useState,
} from "react";

/** Hidden on screen, still read by screen readers. Inline, so it works without our stylesheet. */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
};

/** Point every ref at the same node. */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

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
  useEffect(() => (enabled ? closeOnEscape(onEscape) : undefined), [enabled, onEscape]);
}

/**
 * Moves focus into the dialog when `open` turns on and hands it back to its
 * opener when it turns off. See `focusDialog` in `@cookieyes/ui`; the opener is
 * remembered by `rememberOpener`, which the opening actions call.
 */
export function useAutoFocusDialog(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: containerRef is a stable ref object; re-running this effect on every render of the caller would refocus the dialog each time.
  useEffect(() => (open ? focusDialog(containerRef.current) : undefined), [open]);
}

/**
 * The banner and the recall button render inline on the server and on the
 * client's first pass (matching, so hydration does not mismatch), then move to
 * `bodyPortalRoot()` once mounted. `useEffect` never runs during server
 * rendering, so this cannot affect the "present in the initial HTML" guarantee.
 */
export function useBodyPortalRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRoot(bodyPortalRoot());
  }, []);
  return root;
}

export function useFocusTrap(enabled: boolean, containerRef: RefObject<HTMLElement | null>): void {
  useEffect(
    () => (enabled ? trapFocus(() => containerRef.current) : undefined),
    [enabled, containerRef],
  );
}
