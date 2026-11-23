/**
 * Build-time constants. Each string below is a sentinel that `scripts/inject-css.mjs` replaces in
 * `dist/styles.js` with the real value from `@cookieyes/svelte`'s built output, as `@cookieyes/nuxt`
 * and `@cookieyes/nextjs` do with a Rollup plugin. Sentinels rather than reading the files at run
 * time because the inlined bytes must be exactly the bytes a consumer's CSP hash was computed
 * over, and because the handle and the stylesheet route then need no file system access.
 *
 * In tests, which run against source, these are the sentinels themselves; the dist-level test in
 * `__tests__/styles.test.ts` checks the real values. The `string` annotations keep the published
 * declarations from carrying the sentinel as a literal type.
 */

/** The banner's paint-critical rules: `@cookieyes/svelte/critical.css`, verbatim. */
export const CRITICAL_CSS: string = "__CY_CRITICAL_CSS__";

/**
 * CSP source expression for {@link CRITICAL_CSS}, for example `'sha256-…'`, ready to append to
 * `style-src`. The same value `@cookieyes/nextjs` publishes, because both inline the same bytes.
 */
export const CRITICAL_CSS_HASH: string = "__CY_CRITICAL_CSS_HASH__";

/** @internal The full stylesheet: `@cookieyes/svelte/styles.css`, verbatim. Served by the route. */
export const _STYLES_CSS: string = "__CY_STYLES_CSS__";

/** @internal Short content hash of the full stylesheet, used as a cache-busting query on its URL. */
export const _STYLES_CSS_VERSION: string = "__CY_STYLES_CSS_VERSION__";

/** The path the handle links the full stylesheet from unless `stylesHref` says otherwise. */
export const DEFAULT_STYLES_HREF = "/cookieyes/styles.css";
