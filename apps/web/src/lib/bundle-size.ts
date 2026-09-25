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
