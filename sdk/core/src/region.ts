import type { RegionConfig, RegionDecision, Regulation } from "./types.js";

/** Anything with a header getter — a `Headers` object, Next's `headers()`, etc. */
export type HeaderSource = { get(name: string): string | null | undefined };

// Location headers hosting providers add automatically, tried in order.
const GEO_HEADERS: ReadonlyArray<{ country: string; region?: string }> = [
  // Vercel — country + region give e.g. "US-CA".
  { country: "x-vercel-ip-country", region: "x-vercel-ip-country-region" },
  // Cloudflare — country only by default (a Worker/rule can add a region header).
  { country: "cf-ipcountry" },
];

/**
 * Read the visitor's region from request headers on the server (Next.js, or any
 * framework). Pass the request's headers and get back a region like "US-CA" or
 * "DE" (or undefined). By default it reads the well-known Vercel/Cloudflare
 * headers; pass `{ header }` to read your own instead. Hand the result to
 * `region.detect` in your client config.
 */
export function regionFromHeaders(
  headers: HeaderSource,
  options?: { header?: string },
): string | undefined {
  if (options?.header) {
    return headers.get(options.header) || undefined;
  }
  for (const { country, region } of GEO_HEADERS) {
    const countryCode = headers.get(country);
    if (!countryCode) continue;
    const regionCode = region ? headers.get(region) : undefined;
    return regionCode ? `${countryCode}-${regionCode}` : countryCode;
  }
  return undefined;
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
 * Decide which regulation applies from the visitor's region alone. A manual
 * regulation always wins; otherwise the detected region is mapped to a
 * regulation, and anything unknown falls back to the strictest — never to the
 * lightest, so a required banner is never skipped.
 *
 * GPC is deliberately *not* considered here: it never changes which banner
 * shows (that is geo only), it only opts a CCPA visitor out client-side. Server
 * and client therefore resolve the same regulation, with no hydration mismatch.
 */
export function resolveRegion(config: RegionConfig, manual?: Regulation): RegionDecision {
  const strictest = config.strictest ?? "GDPR";

  // A manual regulation always wins.
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

  // Detect the region and map it. Unknown/unmapped → strictest.
  const region = config.detect?.();
  const mapped = region ? mapRegion(config.map, region) : undefined;
  const regulation: Regulation = mapped ?? strictest;
  const source: RegionDecision["source"] = mapped ? "detected" : "strictest";
  const confidence: RegionDecision["confidence"] = mapped ? "high" : "low";

  return { region, regulation, source, confidence };
}
