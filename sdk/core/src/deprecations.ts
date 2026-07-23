let warnedOfflineMode = false;

/**
 * One-time-per-page-load console warning for `mode: "offline"`.
 * Both @cookieyes/core and @cookieyes/react call this so the wording and the
 * "once" behavior stay identical no matter which package reads the setting.
 */
export function _warnOfflineModeDeprecated(): void {
  if (warnedOfflineMode) return;
  warnedOfflineMode = true;
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(
    '[cookieyes] mode: "offline" has been renamed to "cookie-only". Both do exactly ' +
      'the same thing, but "offline" is deprecated and will be removed in 3 releases. ' +
      'Update to .mode("cookie-only") (or { mode: "cookie-only" }).',
  );
}

/** @internal test-only — resets the one-time warning guard between test cases. */
export function _resetOfflineModeWarning(): void {
  warnedOfflineMode = false;
}
