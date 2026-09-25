/**
 * The published Cookiebannerbench run, for anything on the site that compares us
 * with another consent banner.
 *
 * The benchmark publishes a site, not a package, so there is nothing to generate
 * from: these figures are transcribed from the run at {@link BENCH.runUrl} and
 * refreshed together whenever a newer run is published. `measured` names the
 * version that run actually loaded — a figure is only citable beside the version
 * it came from, and ours move faster than the benchmark re-runs.
 *
 * Every figure is the p75 of 20 loads on the throttled-mobile, cold-cache condition,
 * read from each installation's detail page (cookiebannerbench.com/cmp/<name>/).
 *
 * Rows: our React package, then the four best-scoring competitors on that condition,
 * one installation per vendor (c15t is its React package in offline mode, its better
 * score). Vendors below them, OneTrust and Ketch, are left out by that rule, not by
 * choice. Both lists hold the same five installations in the same order, so a reader
 * comparing the two charts compares the same things. Our row comes first, because
 * the section reads its headline figure from the first entry.
 */
export const BENCH = {
  runUrl: "https://cookiebannerbench.com/",
  condition: "throttled mobile · cold cache · p75",
  measured: "@cookieyes/react 0.8.0, run of 24 Sep 2026",
};

/** Bytes the page transferred over the wire beyond the same page with no consent SDK. */
export const TRANSFERRED = [
  { label: "cookieyes", kb: 21.7, ours: true },
  { label: "c15t", kb: 58.8 },
  { label: "osano", kb: 78.2 },
  { label: "enzuzo", kb: 116.7 },
  { label: "iubenda", kb: 131.0 },
];

/** Navigation start to the consent banner being visible. */
export const TIME_TO_BANNER = [
  { label: "cookieyes", ms: 473, ours: true },
  { label: "c15t", ms: 1700 },
  { label: "osano", ms: 1700 },
  { label: "enzuzo", ms: 1800 },
  { label: "iubenda", ms: 2000 },
];

/** How many times lighter or faster we are than the slowest or heaviest row shown, to one decimal. */
export function leadOver(values: number[]): number {
  return Math.round((Math.max(...values) / Math.min(...values)) * 10) / 10;
}

/**
 * Bar width on a log scale, across the span the design's bars already used (11%
 * to 64%). Log, because the slowest row is an order of magnitude past the
 * fastest and a linear scale would flatten everything below it into nothing.
 */
export function logWidth(value: number, all: number[]): string {
  const low = Math.log10(Math.min(...all));
  const high = Math.log10(Math.max(...all));
  if (high === low) return "64%";
  const position = (Math.log10(value) - low) / (high - low);
  return `${Math.round(11 + position * 53)}%`;
}

/** "1.2 s" past a second, "241 ms" below it — the benchmark's own way of writing them. */
export function formatMs(ms: number): { count: string; suffix: string } {
  return ms >= 1000
    ? { count: String(Math.round(ms / 100) / 10), suffix: " s" }
    : { count: String(ms), suffix: " ms" };
}
