"use client";

import { type RefObject, type SyntheticEvent, useEffect, useState } from "react";

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

// Set by rememberFocusBeforeDialog() at the moment an opening action fires —
// deliberately *not* captured inside the dialog's own mount effect, because
// opening a dialog also hides the banner in the same render. By the time an
// effect runs, the button that triggered the open may already be gone from
// the DOM (and the browser will have defaulted focus to <body>), so we'd be
// "remembering" the wrong element. Capturing it synchronously in the click
// handler, before that re-render happens, is the only reliable point.
let lastFocusedBeforeDialog: HTMLElement | null = null;
// Text/aria-label snapshot of the opener, captured alongside the reference —
// used to re-find its replacement by identity if the original node doesn't
// survive the remount (see useAutoFocusDialog's cleanup).
let lastFocusedIdentity: string | null = null;

function identityOf(el: HTMLElement | null): string | null {
  if (!el) return null;
  const text = (el.getAttribute("aria-label") || el.textContent || "").trim();
  return text.length > 0 ? text : null;
}

/**
 * Call this synchronously inside an action that's about to open a dialog
 * (e.g. `showPreferences`, `showOptOut`), before it triggers the state
 * change — see {@link useAutoFocusDialog}.
 */
export function rememberFocusBeforeDialog(): void {
  const el = document.activeElement as HTMLElement | null;
  lastFocusedBeforeDialog = el;
  lastFocusedIdentity = identityOf(el);
}

/**
 * On open: moves focus into the dialog container (so screen readers announce
 * its `aria-label` instead of falling back to page-level context). On close:
 * returns focus to whatever was remembered via {@link rememberFocusBeforeDialog},
 * so the visitor lands back exactly where they were.
 *
 * The container must be focusable (`tabIndex={-1}`) for this to work — it
 * isn't a real tab stop, just a programmatic focus target.
 */
export function useAutoFocusDialog(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: containerRef is a stable ref object; re-running this effect on every render of the caller would refocus the dialog each time.
  useEffect(() => {
    if (!open) return;
    containerRef.current?.focus();

    return () => {
      const opener = lastFocusedBeforeDialog;
      const identity = lastFocusedIdentity;
      lastFocusedBeforeDialog = null;
      lastFocusedIdentity = null;

      // The opener itself can unmount while its dialog is open (the banner
      // and RecallButton both hide while Preferences/OptOut is open, and
      // remount as a *new* DOM node when it closes) — a stale reference is
      // simply disconnected, `.focus()` on it is a silent no-op. Prefer the
      // real opener if it survived; otherwise re-find its replacement by the
      // same rendered text/aria-label, so "Do Not Sell" reliably lands back
      // on "Do Not Sell" and not just whichever control happens to be first.
      if (opener?.isConnected) {
        opener.focus();
        return;
      }
      const candidates = document.querySelectorAll<HTMLElement>(
        "[data-cky-banner] button, [data-cky-banner] a, .cy-widget",
      );
      const match = identity
        ? Array.from(candidates).find((el) => identityOf(el) === identity)
        : undefined;
      (match ?? candidates[0])?.focus();
    };
  }, [open]);
}

// Shared by anything that needs to be reachable within the first Tab/swipe
// rather than wherever <CookieYesRoot> happens to mount (after the app's own
// content, per the docs and CLI scaffold) — currently the banner and the
// recall button. Renders inline on the server and on the client's first pass
// (matching, so hydration doesn't mismatch), then relocates once mounted.
// `useEffect` never runs during server rendering, so this can't affect the
// "present in the initial HTML" guarantee.
const BODY_PORTAL_ROOT_ID = "cookieyes-portal-root";

function getOrCreateBodyPortalRoot(): HTMLElement {
  const existing = document.getElementById(BODY_PORTAL_ROOT_ID);
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = BODY_PORTAL_ROOT_ID;
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}

export function useBodyPortalRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRoot(getOrCreateBodyPortalRoot());
  }, []);
  return root;
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
