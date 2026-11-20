import type { RegionDecision } from "@cookieyes/core";
import { _view } from "./reactive.svelte.js";
import { _useContext } from "./useRuntime.js";

/**
 * How the active regulation was decided: the detected `region`, the resolved `regulation`, the
 * `source` and a `confidence`. For the regulation alone, `useRegulation()` is enough.
 */
export function useRegion(): RegionDecision {
  const { region } = _useContext("useRegion");
  return _view(region);
}
