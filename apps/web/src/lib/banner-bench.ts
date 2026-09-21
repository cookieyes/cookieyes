/**
 * The published Cookiebannerbench run, for anything on the site that compares us
 * with another consent banner.
 *
 * The benchmark publishes a site, not a package, so there is nothing to generate
 * from: these figures are transcribed from the run at {@link BENCH.runUrl} and
 * refreshed together whenever a newer run is published. `measured` names the
 * versions that run actually loaded — a figure is only citable beside the version
 * it came from, and ours move faster than the benchmark re-runs.
 *
 * Every figure here is the p75 of 20 loads on the fast-desktop, cold-cache
 * condition, the closest of the published conditions to how this page is read.
 *
 * Only what the run could measure appears. The vendor-script installations serve
 * from hosts that expose no cross-origin resource sizes, so their transferred
 * bytes are unknown — not zero — and they are named in {@link BYTES_NOT_MEASURED}
 * rather than drawn as an empty bar.
 *
 * Both lists are ordered best first, with our row first, because the section
 * reads its headline figure from the first entry.
 */
export const BENCH = {
  runUrl: "https://cookiebannerbench.com/",
  runDate: "15 September 2026",
  condition: "fast desktop · cold cache · p75",
  measured: "@cookieyes/react 0.8.0",
};

/** Bytes the page transferred beyond the same page with no consent SDK. */
export const TRANSFERRED = [
  { label: "cookieyes", kb: 19.8, ours: true },
  { label: "c15t", kb: 58.0 },
];

/** Providers whose bytes the run could not read, listed so their absence is not read as zero. */
export const BYTES_NOT_MEASURED = ["enzuzo", "iubenda", "ketch", "onetrust", "osano"];

/** Navigation start to the consent banner being visible. */
export const TIME_TO_BANNER = [
  { label: "cookieyes", ms: 112, ours: true },
  { label: "iubenda", ms: 241 },
  { label: "onetrust", ms: 277 },
  { label: "enzuzo", ms: 402 },
  { label: "osano", ms: 434 },
  { label: "c15t", ms: 1200 },
  { label: "ketch", ms: 1500 },
];

/** How many times lighter or faster we are than the worst measured row, to one decimal. */
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
