import type { CookieYesRuntime } from "../runtime.js";
import { _useRuntime } from "./useRuntime.js";

/**
 * Low-level: the underlying runtime (manager, snapshot getters, script registration). Most
 * components want `useConsent()` or `useConsentActions()`; reach for this only when neither
 * exposes what you need.
 */
export function useConsentRuntime(): CookieYesRuntime {
  return _useRuntime("useConsentRuntime");
}
