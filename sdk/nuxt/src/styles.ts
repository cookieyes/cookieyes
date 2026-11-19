/**
 * Build-time constants. Each string below is a sentinel that `rollup.config.mjs`'s `injectCss`
 * plugin replaces with the real value from `@cookieyes/vue`'s built output, as
 * `@cookieyes/nextjs` does from `@cookieyes/react`'s. Sentinels rather than reading the files at
 * run time because the inlined bytes must be exactly the bytes a consumer's CSP hash was computed
 * over, and because the module and the Nitro handler then need no file system access.
 *
 * In tests, which run against source, these are the sentinels themselves; the dist-level test in
 * `__tests__/styles.test.ts` checks the real values.
 */

/** The banner's paint-critical rules: `@cookieyes/vue/critical.css`, verbatim. */
export const CRITICAL_CSS = "__CY_CRITICAL_CSS__";

/**
 * CSP source expression for {@link CRITICAL_CSS}, for example `'sha256-…'`, ready to append to
 * `style-src`. The same value `@cookieyes/nextjs` publishes, because both inline the same bytes.
 */
export const CRITICAL_CSS_HASH = "__CY_CRITICAL_CSS_HASH__";

/** @internal The full stylesheet: `@cookieyes/vue/styles.css`, verbatim. Served by the module's route. */
export const _STYLES_CSS = "__CY_STYLES_CSS__";

/** @internal Short content hash of the full stylesheet, used as a cache-busting query on its URL. */
export const _STYLES_CSS_VERSION = "__CY_STYLES_CSS_VERSION__";

/** The path the module serves the full stylesheet from unless `cookieyes.stylesHref` says otherwise. */
export const DEFAULT_STYLES_HREF = "/cookieyes/styles.css";
