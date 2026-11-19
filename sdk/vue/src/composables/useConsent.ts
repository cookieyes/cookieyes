import type { ComputedRef } from "vue";
import type { CookieYesSnapshot } from "../runtime.js";
import { _useSnapshot } from "./useSnapshot.js";

/**
 * The recommended way to read consent state. Tracks every change: accepted and rejected
 * categories, banner visibility and the rest. For one category see `useConsentCategory()`; for
 * actions see `useConsentActions()`.
 */
export function useConsent(): ComputedRef<CookieYesSnapshot> {
  return _useSnapshot("useConsent");
}
