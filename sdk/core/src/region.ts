import type { RegionConfig, RegionDecision, Regulation } from "./types.js";

/**
 * Declared locally rather than pulled in from `@types/node` — see the
 * identical note in `deprecations.ts`. A build-time constant read behind a
 * literal comparison does not make `resolveRegion` impure in any sense that
 * matters here (it's still deterministic for a given build — the literal is
 * replaced once, at bundle time, not read per call) — it exists purely so a
 * consumer's bundler can fold the `forced` handling away and leave the
 * REST of this function's compiled output identical to the pre-AD-4 version.
 */
declare const process: { env: { NODE_ENV?: string } };

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
 *
 * `forced` is the `@cookieyes/devtools` region-override value (AD-4): when
 * present in a non-production build, it is used in place of
 * `config.detect()`'s return and `source` becomes `"forced"` — never
 * confusable with a real detection. It is handled in its own early-return
 * branch, guarded by this exact literal, so the MAIN body below — the
 * pre-AD-4 code — is untouched source, byte for byte: in production the
 * whole `if` folds to `if (false)` and disappears, and every caller that
 * omits the third argument (or a caller whose own guard already folded it to
 * `undefined`) sees exactly the original function.
 */
export function resolveRegion(
  config: RegionConfig,
  manual?: Regulation,
  forced?: string,
): RegionDecision {
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

  // Dev-only `forceRegion` override — a separate branch, not woven into the
  // detection path below, so that path stays exactly what it was before AD-4.
  if (process.env.NODE_ENV !== "production" && forced !== undefined) {
    const mapped = mapRegion(config.map, forced);
    return {
      region: forced,
      regulation: mapped ?? strictest,
      source: "forced",
      confidence: "high",
    };
  }

  // Detect the region and map it. Unknown/unmapped → strictest.
  const region = config.detect?.();
  const mapped = region ? mapRegion(config.map, region) : undefined;
  const regulation: Regulation = mapped ?? strictest;
  const source: RegionDecision["source"] = mapped ? "detected" : "strictest";
  const confidence: RegionDecision["confidence"] = mapped ? "high" : "low";

  return { region, regulation, source, confidence };
}

/**
 * @internal Dev aid for `region.debug`: print how the regulation was decided,
 * plus whether GPC started the visitor opted out. Shared by both runtimes.
 */
export function _logRegionDecision(decision: RegionDecision, gpcOptOut: boolean): void {
  if (typeof console === "undefined") return;
  // eslint-disable-next-line no-console
  console.info("[cookieyes] region detection", {
    region: decision.region,
    regulation: decision.regulation,
    source: decision.source,
    confidence: decision.confidence,
    gpcOptOut,
  });
}
