import type { ConsentRuntime, CookieYesConfig } from "@cookieyes/core";
import { mountWidget, type Widget } from "./widget.js";

// The CookieYes banner for a page with no framework, or a framework without an
// adapter yet. It draws `@cookieyes/ui`'s markup with plain browser code and
// keeps every consent decision in `@cookieyes/core`.

let widget: Widget | null = null;

/**
 * Starts the SDK and puts the banner on the page: the banner, the preferences
 * and opt-out dialogs, the reload notice and the recall button, each when its
 * state calls for it. Takes the same configuration as `initCookieYes` in every
 * other package, and returns the consent runtime for reading consent and
 * listening to changes.
 *
 * Calling it again replaces the previous banner.
 *
 * @example const cy = start({ mode: "cookie-only", regulation: "GDPR" });
 */
export function start(config: CookieYesConfig): ConsentRuntime {
  if (widget) {
    if (typeof console !== "undefined") {
      console.warn("[cookieyes] start() called more than once. Replacing the previous banner.");
    }
    widget.destroy();
  }
  widget = mountWidget(config);
  return widget.runtime;
}

/**
 * Opens the preferences dialog, for a "Cookie settings" link of your own.
 * Focus returns to whatever was focused when the dialog closes.
 */
export function openPreferences(): void {
  widget?.openPreferences();
}

/** Opens the CCPA opt-out dialog, for a "Do Not Sell" link of your own. */
export function openOptOut(): void {
  widget?.openOptOut();
}

/**
 * Removes everything `start` put on the page, every listener it added, and the
 * consent runtime, so `start` can run again from a clean page.
 */
export function destroy(): void {
  widget?.destroy();
  widget = null;
}

export type { ConsentRuntime, CookieYesConfig } from "@cookieyes/core";
export { renderShell } from "./shell.js";
