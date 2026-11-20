import { closeOnEscape, focusDialog, trapFocus } from "@cookieyes/ui";
import { tick } from "svelte";

/**
 * Runs the caller's handler first, then ours, unless the caller prevented default. A handler
 * that calls `e.preventDefault()` therefore suppresses the consent action, as in React.
 */
export function chain<E extends { defaultPrevented: boolean }>(
  userHandler: unknown,
  defaultHandler: (e: E) => void,
): (e: E) => void {
  return (e) => {
    if (typeof userHandler === "function") userHandler(e);
    if (!e.defaultPrevented) defaultHandler(e);
  };
}

/**
 * Calls `onEscape` on Escape while `enabled()` is true. Effects run after the DOM updates and
 * only in the browser, so a dialog that has just opened is already on the page.
 */
export function useEscapeKey(enabled: () => boolean, onEscape: () => void): void {
  $effect(() => {
    if (!enabled()) return;
    return closeOnEscape(onEscape);
  });
}

/**
 * Moves focus into the dialog when `open()` turns on and hands it back to its opener when it
 * turns off. See `focusDialog` in `@cookieyes/ui`; the opener is remembered by
 * `rememberOpener`, which the opening actions call.
 */
export function useAutoFocusDialog(open: () => boolean, el: () => HTMLElement | null): void {
  $effect(() => {
    if (!open()) return;
    const restore = focusDialog(el());
    // Handed back after the flush, not in it: the control that takes focus (the recall button)
    // may have just appeared and is moved into the portal root by its own action in this same
    // flush, and moving an element drops its focus.
    return () => {
      void tick().then(restore);
    };
  });
}

/** Keeps Tab inside the element while `enabled()` is true. */
export function useFocusTrap(enabled: () => boolean, el: () => HTMLElement | null): void {
  $effect(() => {
    if (!enabled()) return;
    return trapFocus(() => el());
  });
}
