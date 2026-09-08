/**
 * Declared locally rather than pulled in from `@types/node`.
 *
 * The guard below needs `process.env.NODE_ENV` to survive into the published
 * output as that exact literal, so a consumer's bundler can replace it. That
 * rules out any defensive form — `globalThis.process?.env?.NODE_ENV`, a
 * `typeof` check — because none of them are the pattern bundlers match.
 *
 * Referencing Node's global types instead (`/// <reference types="node" />`)
 * would work for the compiler but risks that reference reaching the emitted
 * `.d.ts`, which would make every consumer of this package need `@types/node`
 * to typecheck. This declaration is module-scoped and ambient, so it types the
 * one expression that needs it and reaches nothing else.
 */
declare const process: { env: { NODE_ENV?: string } };

/*
 * Every warning in this file opens with `if (process.env.NODE_ENV ===
 * "production") return;`.
 *
 * Deprecation warnings exist for whoever is writing the integration. They are
 * of no use to a visitor, who cannot act on one and never opens the console, so
 * shipping the text to them is pure weight — measured at 224 bytes of gzip in
 * core and 175 in the interface layer (see tools/size/README.md).
 *
 * The check is written as this exact literal, at the top of each function and
 * not hoisted into a shared constant, because that is the form bundlers
 * recognise and replace. Once `process.env.NODE_ENV` becomes `"production"` the
 * condition is constant, the early return is unconditional, and the rest of the
 * function — the strings included — is dead code the minifier removes.
 *
 * Two forms that look equivalent and are not, both tried and measured:
 *
 * - Hoisting it into `const DEV = ...` shared by the file: the constant folds,
 *   but nothing else does, and the guarded bodies survive.
 * - Guarding with `typeof process === "undefined" || process.env.NODE_ENV !==
 *   "production"` to stay safe where `process` is absent: `typeof process` is
 *   not statically replaced, so the whole expression stops folding. Measured:
 *   core grew by 10 bytes and every warning string stayed in the bundle.
 *
 * The consequence of the literal form is that these functions need `process` to
 * exist, which means a bundler (or Node). That is already true of every
 * supported install path — the package advertises only `import`/`require`
 * conditions, no browser-global build — and it is the same trade React makes
 * for the same reason.
 */

let warnedOfflineMode = false;

/**
 * One-time-per-page-load console warning for `mode: "offline"`.
 * Both @cookieyes/core and @cookieyes/react call this so the wording and the
 * "once" behavior stay identical no matter which package reads the setting.
 *
 * No-op in a production bundle; see the note at the top of this file.
 */
export function _warnOfflineModeDeprecated(): void {
  if (process.env.NODE_ENV === "production") return;
  if (warnedOfflineMode) return;
  warnedOfflineMode = true;
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(
    '[cookieyes] mode: "offline" has been renamed to "cookie-only". Both do exactly ' +
      'the same thing, but "offline" is deprecated and will be removed after three release cycles. ' +
      "See https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx for the full migration guide. " +
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
 *
 * No-op in a production bundle; see the note at the top of this file.
 */
export function _warnBuiltInIntegrationsDeprecated(): void {
  if (process.env.NODE_ENV === "production") return;
  if (warnedBuiltInIntegrations) return;
  warnedBuiltInIntegrations = true;
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(
    "[cookieyes] `builtInIntegrations` (formerly the `integrations` field) is deprecated " +
      "and will be removed after three release cycles. Use the `integrations` field with a " +
      "preset from `@cookieyes/scripts` instead. See " +
      "https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx for the full migration guide.",
  );
}

/** @internal test-only — resets the one-time warning guard between test cases. */
export function _resetBuiltInIntegrationsWarning(): void {
  warnedBuiltInIntegrations = false;
}
