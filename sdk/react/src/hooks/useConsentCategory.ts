"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

/**
 * Low-level: reads a single category and re-renders only when *that*
 * category's value changes, not on every consent update — use this instead
 * of `useConsent()` when you're gating one thing (e.g. an embed) and
 * want to avoid re-rendering on unrelated category changes.
 */
export function useConsentCategory(category: ConsentCategory): boolean {
  return useRuntimeSelector((snap) => snap.categories[category] === true, false);
}
