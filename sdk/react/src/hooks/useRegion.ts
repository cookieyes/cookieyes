"use client";

import type { RegionDecision } from "@cookieyes/core";
import { _tryGetCookieYes } from "../runtime.js";

// Fixed at init, so no subscription is needed. On the server / before mount,
// report the safe default.
const SSR_REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};

/**
 * How the active regulation was decided: the detected `region`, the resolved
 * `regulation`, the `source` ("manual" | "detected" | "gpc" | "strictest"), and
 * a `confidence`. For the regulation alone, `useRegulation()` is enough.
 */
export function useRegion(): RegionDecision {
  return _tryGetCookieYes()?.getRegion() ?? SSR_REGION;
}
