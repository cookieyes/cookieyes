import type { ResolvedCategories } from "@cookieyes/core";
import { _useRuntime } from "./useRuntime.js";

/**
 * The resolved category taxonomy in effect: the custom list, or the built-in five. It drives
 * the preferences UI so it renders exactly the configured categories.
 */
export function useCategories(): ResolvedCategories {
  return _useRuntime("useCategories").categories;
}
