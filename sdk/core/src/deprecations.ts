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
      'the same thing, but "offline" is deprecated and will be removed after three release cycles. ' +
      "See https://developer.cookieyes.com/docs/migration for the full migration guide. " +
      'Update to .mode("cookie-only") (or { mode: "cookie-only" }).',
  );
}

/** @internal test-only — resets the one-time warning guard between test cases. */
export function _resetOfflineModeWarning(): void {
  warnedOfflineMode = false;
}

let warnedBuiltInIntegrations = false;

/**
 * One-time-per-page-load console warning for the deprecated `builtInIntegrations`
 * config field (formerly `integrations`). Both packages call this so the wording
 * and the "once" behavior stay identical.
 */
export function _warnBuiltInIntegrationsDeprecated(): void {
  if (warnedBuiltInIntegrations) return;
  warnedBuiltInIntegrations = true;
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(
    "[cookieyes] `builtInIntegrations` (formerly the `integrations` field) is deprecated " +
      "and will be removed after three release cycles. Use the `integrations` field with a " +
      "preset from `@cookieyes/scripts` instead. See " +
      "https://developer.cookieyes.com/docs/migration for the full migration guide.",
  );
}

/** @internal test-only — resets the one-time warning guard between test cases. */
export function _resetBuiltInIntegrationsWarning(): void {
  warnedBuiltInIntegrations = false;
}
