import type { ResolvedCategories } from "@cookieyes/core";
import { type ComputedRef, computed } from "vue";
import { _useRuntime } from "./useRuntime.js";

/**
 * The resolved category taxonomy in effect: the custom list, or the built-in five. It drives
 * the preferences UI so it renders exactly the configured categories.
 */
export function useCategories(): ComputedRef<ResolvedCategories> {
  const runtime = _useRuntime("useCategories");
  return computed(() => runtime.categories);
}
