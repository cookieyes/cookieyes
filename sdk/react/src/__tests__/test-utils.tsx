import type { Regulation } from "@cookieyes/core";
import { type CookieYesRuntime, createCookieYes, resetCookieYes } from "../runtime.js";

/** Wipes the persisted consent cookie so each test starts fresh. */
export function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

/** Mounts an offline runtime for the given regulation and returns it. */
export function mountOffline(regulation: Regulation = "GDPR"): CookieYesRuntime {
  return createCookieYes().mode("offline").regulation(regulation).mount();
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
