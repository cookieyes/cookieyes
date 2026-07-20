"use client";

import { type CookieYesRuntime, getCookieYes } from "../runtime.js";

/**
 * Low-level: direct access to the underlying runtime (manager, snapshot
 * getters, script registration). Most components want `useConsent()`
 * or `useConsentActions()` instead — reach for this only when you need
 * something neither of those exposes.
 */
export function useConsentRuntime(): CookieYesRuntime {
  return getCookieYes();
}
