import type { RegionConfig, RegionDecision, Regulation } from "./types.js";

// Strictness order: GDPR (opt-in) > CCPA (opt-out) > DEFAULT (none).
const RANK: Record<string, number> = { DEFAULT: 0, CCPA: 1, GDPR: 2 };
function stricter(a: Regulation, b: Regulation): Regulation {
  return (RANK[a] ?? 0) >= (RANK[b] ?? 0) ? a : b;
}

/** True when the browser is sending the GPC "do not sell/share" signal. */
export function readGpc(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

// Match the full region first ("US-CA"), then its country part ("US").
function mapRegion(
  map: Record<string, Regulation> | undefined,
  region: string,
): Regulation | undefined {
  if (!map) return undefined;
  return map[region] ?? map[region.split("-")[0] ?? ""];
}

/**
 * Decide which regulation applies. A manual regulation always wins; otherwise
 * the detected region is mapped to a regulation, GPC forces at least the CCPA
 * opt-out, and anything unknown falls back to the strictest regulation — never
 * to the lightest, so a required banner is never skipped.
 */
export function resolveRegion(config: RegionConfig, manual?: Regulation): RegionDecision {
  const strictest = config.strictest ?? "GDPR";

  // 1. A manual regulation always wins (Story 8).
  if (manual) {
    if (config.detect && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[cookieyes] `regulation` is set manually, so region detection is ignored. " +
          "Remove one of them to clear the conflict.",
      );
    }
    return { region: undefined, regulation: manual, source: "manual", confidence: "high" };
  }

  // 2. Detect the region and map it. Unknown/unmapped → strictest (Story 3).
  const region = config.detect?.();
  const mapped = region ? mapRegion(config.map, region) : undefined;
  let regulation: Regulation = mapped ?? strictest;
  let source: RegionDecision["source"] = mapped ? "detected" : "strictest";
  const confidence: RegionDecision["confidence"] = mapped ? "high" : "low";

  // 3. GPC forces at least the CCPA opt-out, whatever the region says (Story 5).
  if ((config.honorGpc ?? true) && readGpc()) {
    const upgraded = stricter(regulation, "CCPA");
    if (upgraded !== regulation || regulation === "CCPA") {
      regulation = upgraded;
      source = "gpc";
    }
  }

  return { region, regulation, source, confidence };
}
