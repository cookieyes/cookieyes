import type { CookieYesRuntime, Regulation } from "@cookieyes/react";
import { initCookieYes, resetCookieYes } from "@cookieyes/react";

/** Wipes the persisted consent + force-region cookies so each test starts fresh. */
export function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.cookie = "__cyd_region=; max-age=0; path=/";
}

/** Mounts a cookie-only runtime for the given regulation and returns it. */
export function mountCookieOnly(regulation: Regulation = "GDPR"): CookieYesRuntime {
  return initCookieYes({ mode: "cookie-only", regulation });
}

/**
 * Wipes `globalThis.__COOKIEYES_DEVTOOLS__` — the dataLayer-style global
 * queue every core/scripts instrumentation site pushes onto (see the note at
 * the top of core's `network-blocker.ts`) — so each test starts with no
 * queued entries and no `.push` wrapper left behind by a previous test's
 * `useDevRuntimeData` mount.
 */
function resetDevQueue(): void {
  delete (globalThis as { __COOKIEYES_DEVTOOLS__?: unknown }).__COOKIEYES_DEVTOOLS__;
}

/** Standard afterEach: drop the singleton runtime, clear cookies + storage. */
export function teardown(): void {
  resetCookieYes();
  resetDevQueue();
  clearCookie();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
}
