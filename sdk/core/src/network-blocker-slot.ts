import type { NetworkBlockerConfig } from "./network-blocker.js";
import type { ConsentCategory } from "./types.js";

/**
 * The seam that lets the network blocker ship only to customers who use it.
 *
 * ## Why this exists
 *
 * The blocker replaces `fetch`, `XMLHttpRequest.prototype.open`/`send` and
 * `navigator.sendBeacon` so that tracking requests are stopped before a visitor
 * has agreed to them. It is a real feature, and until now every customer
 * downloaded it whether they had configured it or not — because `runtime.ts`
 * imported it at the top of the file unconditionally and only *called* it if
 * `networkBlocker` was configured. A bundler can drop code nobody uses, but an
 * unconditional import counts as using it.
 *
 * ## Why not a dynamic import
 *
 * Deferring the blocker behind `import()` would save the same bytes and put a
 * hole in the feature. Its whole purpose is to have the browser's networking
 * already replaced when the page starts; between the page starting and the
 * chunk arriving, nothing is patched and an early-firing tracker gets through.
 * On a compliance product that is not a trade worth a kilobyte.
 *
 * ## What happens instead
 *
 * `@cookieyes/core/network-blocker` is its own entry point. A customer who
 * wants the feature imports it and calls `registerNetworkBlocker()`, which
 * fills the slot below with the real installer. Because that is an ordinary
 * static import, the blocker is present and installs **eagerly** during setup —
 * exactly as it does today, with no timing gap. A customer who does not import
 * it never downloads it, and this file is all that remains in the main chunk.
 *
 * The `networkBlocker` config field is unchanged. What changed is that
 * configuring it is no longer sufficient on its own, so a setup that configures
 * it without registering fails loudly rather than silently not blocking —
 * see `_installRegisteredNetworkBlocker`.
 */

type Installer = (
  config: NetworkBlockerConfig,
  hasConsent: (category: ConsentCategory) => boolean,
) => () => void;

let installer: Installer | null = null;
let activeUninstall: (() => void) | null = null;

/**
 * Fill the slot. Called by `registerNetworkBlocker()` in the
 * `@cookieyes/core/network-blocker` entry point — not something to call
 * directly.
 *
 * @internal
 */
export function _setNetworkBlockerInstaller(fn: Installer): void {
  installer = fn;
}

/**
 * Record the teardown for a blocker that is currently installed.
 *
 * `installNetworkBlocker` calls this itself, so `resetConsentRuntime()` un-patches
 * the transports whether the blocker was installed through the runtime's config
 * or by a direct call. That matters beyond tidiness: the blocker is a
 * module-level singleton and a second install is a silent no-op while one is
 * active, so a reset that left it installed would leave the *next* setup running
 * on the old rules and the old consent closure while appearing to accept new
 * ones — wrong behaviour with nothing in the console.
 *
 * @internal
 */
export function _setActiveNetworkBlockerUninstall(fn: (() => void) | null): void {
  activeUninstall = fn;
}

/** @internal Test-only — empties the slot so one test cannot leak into the next. */
export function _clearNetworkBlockerInstaller(): void {
  activeUninstall?.();
  activeUninstall = null;
  installer = null;
}

/** True when a customer has registered the blocker. @internal */
export function _hasNetworkBlockerInstaller(): boolean {
  return installer !== null;
}

/**
 * Install the registered blocker, or complain loudly that there isn't one.
 *
 * The failure mode this guards against is the dangerous one: a customer who
 * configured `networkBlocker` before this change and upgrades would otherwise
 * find their requests silently no longer blocked, which on a consent product is
 * worse than a crash. `console.error` rather than `throw` because taking the
 * page down is not proportionate, and the message names the exact two lines
 * needed to fix it.
 *
 * @internal — consumed by core's runtime and by framework adapters.
 */
export function _installRegisteredNetworkBlocker(
  config: NetworkBlockerConfig,
  hasConsent: (category: ConsentCategory) => boolean,
): void {
  if (!installer) {
    if (typeof console !== "undefined") {
      // Kept terse on purpose: this string sits in every consumer's bundle,
      // including those that never configure the blocker. It has to be
      // unmissable and name the fix, and nothing more.
      console.error(
        "[cookieyes] `networkBlocker` is configured but nothing is being blocked. Add:\n" +
          '  import { registerNetworkBlocker } from "@cookieyes/core/network-blocker";\n' +
          "  registerNetworkBlocker();  // before your setup call\n" +
          "It is a separate entry point so it is not downloaded by those who do not use it.",
      );
    }
    return;
  }
  activeUninstall = installer(config, hasConsent);
}

/**
 * Restore the browser's networking functions, if the blocker was installed.
 *
 * Idempotent, and a no-op when nothing was installed — which is why the runtime
 * can call it unconditionally on reset without dragging the blocker back into
 * the bundle.
 *
 * @internal
 */
export function _uninstallRegisteredNetworkBlocker(): void {
  // Cleared before the call, not after: the teardown itself clears this slot
  // (see `_setActiveNetworkBlockerUninstall`), and reading a stale reference
  // afterwards would undo that.
  const teardown = activeUninstall;
  activeUninstall = null;
  teardown?.();
}
