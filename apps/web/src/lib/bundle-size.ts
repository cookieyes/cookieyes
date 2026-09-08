import bundleSize from "../../.generated/bundle-size.json";

/**
 * The measured bundle-size figures, for anything on the site that states one.
 *
 * There is one source: `tools/size/size-report.json`, produced by `pnpm size`
 * and enforced by the size-budget job in CI. `apps/web/scripts/generate-bundle-size.mjs`
 * turns it into the JSON this module re-exports, on every web build.
 *
 * Do not hard-code a size anywhere on the site. The landing page previously
 * stated "9 KB gz" for the banner in three separate places while the banner
 * measured 17.2 KB — three copies of a number nobody owned, none generated, and
 * no basis printed beside any of them.
 */
export const BUNDLE_SIZE = bundleSize;

/** e.g. "16.1 KB" — the banner, which is what the page's own wording claims. */
export const BANNER_SIZE = bundleSize.layers.banner.label;

/** e.g. "8.4 KB" — the headless engine, no UI. */
export const CORE_SIZE = bundleSize.layers.core.label;

/** e.g. "16.7 KB" — banner, preferences dialog and recall button together. */
export const INTERFACE_SIZE = bundleSize.layers.interface.label;

/** "gzipped, measured against an empty Next.js app" — always show it with a figure. */
export const SIZE_BASIS = bundleSize.basis;

/**
 * The "N× smaller than X" comparison, or `null` when it cannot be stated
 * honestly.
 *
 * It returns `null` while any competitor figure in the chart lacks a citation,
 * which is the case today: the three numbers on the page have no source
 * recorded anywhere in the repo, so the ratio is not reproducible by a reader
 * in either direction — it could as easily be understating our lead as
 * overstating it. Add sources in `generate-bundle-size.mjs` and the claim
 * renders itself.
 */
export function sizeComparison(competitor: string): { ratio: number; kb: number } | null {
  if (!bundleSize.comparison.publishable) return null;
  const match = bundleSize.comparison.against.find((entry) => entry.name === competitor);
  return match ? { ratio: match.ratio, kb: match.kb } : null;
}

/**
 * Bar width for the log-scale comparison chart.
 *
 * The chart's widths came from the design file as fixed percentages against the
 * old figures (9 KB at 15%, 34 KB at 34%). This maps a measured size onto that
 * same implied scale so the bar and its label cannot disagree — a corrected
 * number beside an uncorrected bar is its own kind of wrong.
 */
export function barWidth(kb: number): string {
  const anchors = [
    { kb: 9, percent: 15 },
    { kb: 34, percent: 34 },
    { kb: 190, percent: 59 },
    { kb: 260, percent: 64 },
  ];
  const log = Math.log10(kb);
  if (log <= Math.log10(anchors[0].kb)) return `${anchors[0].percent}%`;
  for (let i = 1; i < anchors.length; i++) {
    const low = anchors[i - 1];
    const high = anchors[i];
    const logLow = Math.log10(low.kb);
    const logHigh = Math.log10(high.kb);
    if (log <= logHigh) {
      const fraction = (log - logLow) / (logHigh - logLow);
      return `${Math.round(low.percent + fraction * (high.percent - low.percent))}%`;
    }
  }
  return `${anchors[anchors.length - 1].percent}%`;
}
