import type { Regulation } from "@cookieyes/core";
import { type CookieYesRuntime, initCookieYes, resetCookieYes } from "../runtime.js";

/** Wipes the persisted consent cookie so each test starts fresh. */
export function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

/**
 * Mounts a cookie-only runtime for the given regulation and returns it.
 * @deprecated call sites kept for coverage still use {@link mountOffline} —
 * both produce an identical runtime.
 */
export function mountOffline(regulation: Regulation = "GDPR"): CookieYesRuntime {
  return initCookieYes({ mode: "offline", regulation });
}

/** Mounts a cookie-only runtime for the given regulation and returns it. */
export function mountCookieOnly(regulation: Regulation = "GDPR"): CookieYesRuntime {
  return initCookieYes({ mode: "cookie-only", regulation });
}

/** Standard afterEach: drop the singleton runtime and clear the cookie. */
export function teardown(): void {
  resetCookieYes();
  clearCookie();
}

let scriptSeq = 0;
/** Unique id helper for script-registration tests (the core registry is global). */
export function uniqueScriptId(): string {
  scriptSeq += 1;
  return `gated-script-${scriptSeq}`;
}
