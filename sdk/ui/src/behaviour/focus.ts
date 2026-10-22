// Keyboard and focus behaviour, written against page elements so every
// framework attaches the same code. Each function returns a cleanup that
// removes what it added, so a framework calls it when a component appears and
// the cleanup when it goes away.

/** What counts as focusable inside a dialog, in the order Tab visits it. */
export const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside `container` while attached. The browser moves
 * focus between the elements in the middle; this only acts at the edges, and
 * when focus is still on the page behind (the banner never takes focus on its
 * own) or on the dialog container itself (right after a dialog opens), where it
 * pulls focus inside.
 *
 * `container` is read on every key press, so a framework can pass a getter for
 * an element that is replaced while the trap is attached.
 */
export function trapFocus(container: () => HTMLElement | null): () => void {
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const root = container();
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    const outside = active === root || !root.contains(active);
    if (e.shiftKey && (active === first || outside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || outside)) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

/** Calls `onEscape` when Escape is pressed anywhere on the page, while attached. */
export function closeOnEscape(onEscape: () => void): () => void {
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") onEscape();
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

// Set by rememberOpener() at the moment an opening action fires, deliberately
// not when the dialog mounts: opening a dialog also hides the banner in the
// same update, so by the time the dialog appears the button that opened it
// may already be gone and focus has fallen back to <body>. Capturing it
// synchronously in the click handler, before that update, is the only
// reliable point.
let opener: HTMLElement | null = null;
// The opener's text or aria-label, kept alongside the reference to re-find its
// replacement if the original element does not survive (see focusDialog).
let openerIdentity: string | null = null;

function identityOf(el: HTMLElement | null): string | null {
  if (!el) return null;
  const text = (el.getAttribute("aria-label") || el.textContent || "").trim();
  return text.length > 0 ? text : null;
}

/**
 * Remembers what has focus, so the dialog about to open can hand it back when
 * it closes. Call it synchronously in the action that opens a dialog, before
 * the state change.
 */
export function rememberOpener(): void {
  const el = document.activeElement as HTMLElement | null;
  opener = el;
  openerIdentity = identityOf(el);
}

/**
 * Moves focus into a dialog that has just opened, so screen readers announce
 * its name instead of falling back to the page. The cleanup returns focus to
 * the element {@link rememberOpener} saw. The container must be focusable
 * (`tabindex="-1"`); it is a focus target, not a Tab stop.
 */
export function focusDialog(container: HTMLElement | null): () => void {
  container?.focus();
  return () => {
    const was = opener;
    const identity = openerIdentity;
    opener = null;
    openerIdentity = null;
    // The opener can leave the page while its dialog is open (the banner and
    // the recall button both hide) and come back as a new element. A stale
    // reference is disconnected and focusing it does nothing, so re-find the
    // replacement by its text or aria-label: "Do Not Sell" lands back on
    // "Do Not Sell", not on whichever control happens to be first.
    if (was?.isConnected) {
      was.focus();
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
}

/**
 * After the banner closes, by a decision or its close button, the button that
 * had focus is gone with it. Hand focus to the recall button so a keyboard
 * user keeps a place on the page. Does nothing when a dialog opened instead:
 * the recall button is not shown then, and the dialog moves focus itself.
 */
export function focusRecallAfterBanner(): void {
  if (document.activeElement === document.body) {
    document.querySelector<HTMLElement>(".cy-widget")?.focus();
  }
}

const PORTAL_ROOT_ID = "cookieyes-portal-root";

/**
 * The element at the very start of `<body>` that holds the banner and the
 * recall button, so they are within the first Tab rather than wherever the app
 * happens to mount them. Created on first use.
 */
export function bodyPortalRoot(): HTMLElement {
  const existing = document.getElementById(PORTAL_ROOT_ID);
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = PORTAL_ROOT_ID;
  document.body.insertBefore(el, document.body.firstChild);
  return el;
}
