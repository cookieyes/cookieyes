"use client";

import type { DevRuntimeData } from "../types.js";

/**
 * Everything the panel knows, in one JSON object: for a bug report or a
 * support ticket. Plain data only (no functions), so it serialises as-is.
 */
export function buildDebugBundle(data: DevRuntimeData) {
  return {
    generatedAt: new Date().toISOString(),
    page: typeof location !== "undefined" ? location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    consent: data.consent,
    region: {
      decision: data.region.decision,
      drivingSignal: data.region.drivingSignal,
      forcedRegion: data.region.forcedRegion,
    },
    integrations: data.integrations,
    blockedRequests: data.blockedRequests,
    googleConsentMode: data.gcm,
    events: data.events,
  };
}
