"use client";

import type { RegionDecision } from "@cookieyes/core";
import { useContext } from "react";
import { RegionContext } from "../context/region-context.js";
import { _tryGetCookieYes } from "../runtime.js";

// On the server / before mount, report the safe default.
const SSR_REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};

/**
 * How the active regulation was decided: the detected `region`, the resolved
 * `regulation`, the `source` ("manual" | "detected" | "strictest"), and a
 * `confidence`. Reads a `<CookieYesProvider>` if one wraps the tree (so it's
 * correct on the server), else the mounted runtime. For the regulation alone,
 * `useRegulation()` is enough.
 */
export function useRegion(): RegionDecision {
  const fromProvider = useContext(RegionContext);
  return fromProvider ?? _tryGetCookieYes()?.getRegion() ?? SSR_REGION;
}
