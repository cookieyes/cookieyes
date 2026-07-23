"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

/**
 * Reads a single category's **committed** consent — the value after Accept /
 * Reject / Save, not an unsaved dialog toggle. Use this for gating (an embed, a
 * tracker): flipping a switch without saving won't flip it. Re-renders only when
 * that category's committed value changes. (For the live toggle, use `useConsent()`.)
 */
export function useConsentCategory(category: ConsentCategory): boolean {
  return useRuntimeSelector((snap) => snap.committedCategories[category] === true, false);
}
