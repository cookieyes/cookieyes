import type { ConsentModeOptions } from "@cookieyes/scripts";
import type { CookieYesConfig } from "@cookieyes/svelte";
import type { Handle } from "@sveltejs/kit";
import { building } from "$app/environment";
import { resolve } from "$app/paths";
import { _consentModeText, _hasHeadAnchor, _headMarkup, _insertHead, _readNonce } from "./head.js";
import { _emptyRequestState, _readRequestConsent, type CookieYesLocals } from "./server-consent.js";
import { _STYLES_CSS_VERSION, DEFAULT_STYLES_HREF } from "./styles.js";

declare global {
  // SvelteKit's `App` namespace is extended with a global declaration and no other way.
  namespace App {
    interface Locals {
      /** Set by `cookieyesHandle`: what the server learned about this request. */
      cookieyes: CookieYesLocals;
    }
  }
}

/**
 * The options of `cookieyesHandle`: the same options `initCookieYes()` takes everywhere else, plus
 * two that only the handle uses.
 */
export type CookieYesSvelteKitConfig = CookieYesConfig & {
  /** Where the stylesheet route is mounted. Default `/cookieyes/styles.css`. */
  stylesHref?: string | undefined;
  /**
   * Adds Google Consent Mode's deny-by-default snippet at the top of the head, before any Google
   * tag, as `<GoogleConsentMode />` does in Next.js. `true` uses the defaults.
   */
  googleConsentMode?: boolean | ConsentModeOptions | undefined;
};

/**
 * Reads each request once, for the consent cookie, the Vercel and Cloudflare geo headers,
 * `Sec-GPC` and, in development, the DevTools region cookie, into `event.locals.cookieyes`, and
 * writes the critical CSS, the stylesheet link and the optional Consent Mode default into the head
 * right after `<meta charset>`. A prerendered page reads nothing, so its HTML is the same for
 * every visitor and the browser decides.
 *
 * It is a factory so that it composes: `export const handle = sequence(cookieyesHandle(config),
 * yourHandle)`, and a `transformPageChunk` of your own still runs.
 *
 * @example
 * // src/hooks.server.ts
 * export const handle = cookieyesHandle(config);
 */
export function cookieyesHandle(options: CookieYesSvelteKitConfig): Handle {
  const { stylesHref = DEFAULT_STYLES_HREF, googleConsentMode, ...config } = options;
  const consentModeText = _consentModeText(googleConsentMode);

  return ({ event, resolve: render }) => {
    event.locals.cookieyes = building
      ? { ..._emptyRequestState(), gpc: false }
      : _readRequestConsent(event.request.headers, config as CookieYesConfig);

    // Resolved per request: the base path, and the relative form SvelteKit may use, depend on it.
    // Cast because `resolve` is typed against the app's own route ids, which a library cannot see.
    const href = `${(resolve as unknown as (pathname: string) => string)(stylesHref)}?v=${_STYLES_CSS_VERSION}`;
    let inserted = false;
    return render(event, {
      // SvelteKit hands the page over in one chunk today; a streamed one is placed on the first
      // chunk that holds an anchor, or on the last one if none ever did.
      transformPageChunk: ({ html, done }) => {
        if (inserted || (!done && !_hasHeadAnchor(html))) return html;
        inserted = true;
        return _insertHead(html, _headMarkup(consentModeText, href, _readNonce(html)));
      },
    });
  };
}
