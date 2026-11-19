import type { RegionDecision } from "@cookieyes/core";
import { type ComputedRef, computed, inject } from "vue";
import { _REGION_KEY } from "../keys.js";
import { _useRuntime } from "./useRuntime.js";

/**
 * How the active regulation was decided: the detected `region`, the resolved `regulation`, the
 * `source` and a `confidence`. Reads a `<CookieYesProvider>` above the component when there is
 * one, else the runtime. For the regulation alone, `useRegulation()` is enough.
 */
export function useRegion(): ComputedRef<RegionDecision> {
  const runtime = _useRuntime("useRegion");
  const fromProvider = inject(_REGION_KEY, null);
  return computed(() => fromProvider?.value ?? runtime.getRegion());
}
