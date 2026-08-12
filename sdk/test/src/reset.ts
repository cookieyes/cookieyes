import {
  _clearScriptRegistry,
  _clearStopHandlers,
  _resetOfflineModeWarning,
  resetConsentRuntime,
  uninstallNetworkBlocker,
} from "@cookieyes/core";
import { _resetCoreVersionWarning } from "./core-version.js";
import { clearConsentCookie, restoreDocument } from "./document.js";
import { restoreDataLayer } from "./google-consent.js";

/**
 * Return every piece of module-level state the consent engine owns to its
 * pristine value, so one test can never observe another's leftovers.
 *
 * The SDK keeps five separate global registries and a runtime singleton, each
 * with its own reset. Getting them in the wrong order is the kind of bug that
 * shows up as one flaky test in a suite of two hundred, so the order is fixed
 * here once and documented:
 *
 * 1. Un-patch `fetch`/XHR **first**, before anything can observe the patched
 *    versions during teardown.
 * 2. Clear the stop-handler registry *and* its granted/stopped transition state.
 * 3. Clear the script registry, removing any injected `<script>` elements.
 * 4. Drop the runtime singleton, so the next `createConsentTest()` builds a new one.
 * 5. Reset the one-per-page deprecation latch, so a warning assertion works next test.
 * 6. Expire the consent cookie, then remove the document shim — in that order, or
 *    the write lands on a document that is already gone.
 * 7. Remove the dataLayer/window shim, restoring any dataLayer that was already
 *    there (a jsdom test may own one).
 * 8. Reset the core-version warning latch, so a test can assert on it.
 *
 * Safe and idempotent: calling it when nothing was ever set up is a no-op.
 */
export function resetConsentTestState(): void {
  uninstallNetworkBlocker();
  _clearStopHandlers();
  _clearScriptRegistry();
  resetConsentRuntime();
  _resetOfflineModeWarning();
  clearConsentCookie();
  restoreDocument();
  restoreDataLayer();
  _resetCoreVersionWarning();
}
