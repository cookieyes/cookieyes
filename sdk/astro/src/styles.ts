/**
 * Build-time constants. Each string below is a sentinel that `rollup.config.mjs`'s `injectCss`
 * plugin replaces with the real value from `@cookieyes/vanilla`'s built output, as
 * `@cookieyes/nuxt` does from `@cookieyes/vue`'s. Sentinels rather than reading the files at run
 * time because the inlined bytes must be exactly the bytes a consumer's CSP hash was computed
 * over, and because the middleware and the stylesheet route then need no file system access.
 *
 * In tests, which run against source, these are the sentinels themselves; the dist-level test in
 * `__tests__/styles.test.ts` checks the real values.
 */

/** The banner's paint-critical rules: `@cookieyes/vanilla/critical.css`, verbatim. */
export const CRITICAL_CSS = "__CY_CRITICAL_CSS__";

/**
 * CSP source expression for {@link CRITICAL_CSS}, for example `'sha256-…'`, ready to append to
 * `style-src`. The same value `@cookieyes/nextjs` and `@cookieyes/nuxt` publish, because all of
 * them inline the same bytes.
 */
export const CRITICAL_CSS_HASH = "__CY_CRITICAL_CSS_HASH__";

/** @internal The full stylesheet: `@cookieyes/vanilla/styles.css`, verbatim. Served by the route. */
export const _STYLES_CSS = "__CY_STYLES_CSS__";

/** @internal Short content hash of the full stylesheet, used as a cache-busting query on its URL. */
export const _STYLES_CSS_VERSION = "__CY_STYLES_CSS_VERSION__";

/**
 * @internal Hides a banner shell rendered for a page shared by every visitor until the head
 * script has read the cookie. A `<style>` of its own, so {@link CRITICAL_CSS} stays byte-identical
 * to the other adapters' and its published hash stays valid.
 */
export const _WAIT_CSS = 'html:not([data-cy-banner="show"]) [data-cy-wait]{display:none}';

/** The path the stylesheet is served from unless `stylesHref` says otherwise. */
export const DEFAULT_STYLES_HREF = "/cookieyes/styles.css";
