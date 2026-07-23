"use client";

import { type ResolvedCategories, resolveCategories } from "@cookieyes/core";
import { _tryGetCookieYes } from "../runtime.js";

// Stable default (built-in five) for SSR / before a runtime is mounted, so the
// value is referentially stable across renders and matches the client.
const DEFAULT_RESOLVED = resolveCategories();

/**
 * The resolved category taxonomy in effect — the customer's custom list, or the
 * built-in five. Drives the Preferences UI so it renders exactly the configured
 * categories. SSR-safe: falls back to the built-in five before mount.
 */
export function useCategories(): ResolvedCategories {
  return _tryGetCookieYes()?.categories ?? DEFAULT_RESOLVED;
}
