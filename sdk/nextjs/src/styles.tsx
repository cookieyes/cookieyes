/**
 * Build-time constants. Each string below is a sentinel that
 * `rollup.config.mjs`'s `injectCss` plugin replaces with the real value from
 * `@cookieyes/react`'s built output — the same pattern `injectPkgVersion` uses
 * for `CORE_VERSION`. Sentinels rather than an `import` of the CSS because a
 * Server Component cannot import a stylesheet (Turbopack rejects it as a
 * "non-ecmascript placeable asset"), and because the inlined bytes must be
 * exactly the bytes a consumer's CSP hash was computed over.
 *
 * In tests, which run against source, these are the sentinels themselves; the
 * dist-level test in `__tests__/styles.test.tsx` checks the real values.
 */

/** The banner's paint-critical rules — `@cookieyes/react/critical.css`, verbatim. */
export const CRITICAL_CSS = "__CY_CRITICAL_CSS__";

/**
 * CSP source expression for {@link CRITICAL_CSS}, e.g. `'sha256-…'`, ready to
 * append to `style-src`. Stable for a given SDK version; published in the
 * changelog on every release that changes the stylesheet.
 */
export const CRITICAL_CSS_HASH = "__CY_CRITICAL_CSS_HASH__";

/** The full stylesheet — `@cookieyes/react/styles.css`, verbatim. Served by `styles-route`. */
export const STYLES_CSS = "__CY_STYLES_CSS__";

/** Short content hash of {@link STYLES_CSS}, used as a cache-busting query on its URL. */
export const STYLES_CSS_VERSION = "__CY_STYLES_CSS_VERSION__";

/** The path {@link CookieYesStyles} points at unless told otherwise. */
export const DEFAULT_STYLES_HREF = "/cookieyes/styles.css";

/**
 * Marks the deferred full-stylesheet `<link>` so the client runtime can find
 * it and switch its `media` from `print` to `all` once the SDK has mounted.
 */
export const DEFERRED_STYLESHEET_ATTR = "data-cy-full";

export interface CookieYesStylesProps {
  /**
   * Where the full stylesheet is served from — the path of your
   * `styles-route` handler. Defaults to `/cookieyes/styles.css`, matching
   * `app/cookieyes/styles.css/route.ts`.
   */
  href?: string;
  /**
   * A per-request CSP nonce, if you use nonces rather than the published
   * {@link CRITICAL_CSS_HASH}. Either works; the hash needs no server-side
   * plumbing and keeps the page statically cacheable.
   */
  nonce?: string;
}

/**
 * Puts the banner's CSS in the first response, so the banner paints in the
 * same frame as the page instead of after a second round trip.
 *
 * Render it once, in your root layout's `<head>`, **instead of** importing
 * `@cookieyes/nextjs/styles.css`. Leaving that import in place puts the full
 * sheet back on the critical path and cancels the gain.
 *
 * ```tsx
 * // app/layout.tsx
 * import { CookieYesStyles } from "@cookieyes/nextjs/server";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <head>
 *         <CookieYesStyles />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * ```ts
 * // app/cookieyes/styles.css/route.ts — the SDK serves its own stylesheet
 * export { GET } from "@cookieyes/nextjs/styles-route";
 * ```
 *
 * What it renders:
 *
 * 1. An inline `<style>` holding `critical.css` — only the rules the banner
 *    needs to paint. This is the one piece of inline markup, and it is static,
 *    so a strict `style-src` policy admits it with a single hash:
 *    `style-src 'self' ${CRITICAL_CSS_HASH}`.
 * 2. A `<link>` to the full stylesheet with `media="print"`, which the browser
 *    fetches at low priority **without blocking render**. The SDK's client
 *    runtime flips it to `media="all"` once mounted — from code that is already
 *    shipping, so there is no inline `<script>` and nothing for `script-src`.
 *
 * Measured on the Lighthouse Mobile profile, cold cache: first paint
 * 468 → 224 ms, banner styled 451 → 183 ms. Neutral on fast desktop, where
 * there is no round trip worth saving.
 *
 * Without JavaScript the full sheet stays inert, but the banner is styled by
 * the critical block and the dialogs cannot open without JavaScript anyway.
 */
export function CookieYesStyles({ href = DEFAULT_STYLES_HREF, nonce }: CookieYesStylesProps = {}) {
  const versioned = `${href}${href.includes("?") ? "&" : "?"}v=${STYLES_CSS_VERSION}`;
  const deferred = { [DEFERRED_STYLESHEET_ATTR]: "" };
  return (
    <>
      <style
        nonce={nonce}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the whole point is a static, hash-pinned inline stylesheet; see the JSDoc.
        dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }}
      />
      <link rel="stylesheet" href={versioned} media="print" {...deferred} />
    </>
  );
}
