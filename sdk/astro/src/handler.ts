import type { CookieYesConfig } from "@cookieyes/core";
import { type _HeadParts, _headMarkup, _insertHeadStream, _readNonce } from "./head.js";
import { _setPageConfig } from "./markup.js";
import { _defaultLocals, _readRequestConsent, type CookieYesLocals } from "./server-consent.js";

/**
 * Keeps a response built from one visitor's request out of shared caches. Next.js gets this from
 * dynamic rendering, which reading cookies switches on; Astro sends no such header, and a CDN that
 * cached the HTML rendered for a California visitor would serve the CCPA banner, and a runtime
 * that grants everything before a choice, to visitors in the EU. A site that already chose a
 * shared-cache directive keeps it, with a warning in development: such a page should be
 * prerendered, which makes its HTML the same for every visitor. Returns whether `headers` changed.
 */
function markPrivate(headers: Headers, request: Request, dev: boolean): boolean {
  const cacheControl = headers.get("cache-control");
  if (cacheControl) {
    if (dev && /(^|[\s,])(public|s-maxage=)/i.test(cacheControl)) {
      console.warn(
        `[cookieyes] ${new URL(request.url).pathname} reads the visitor's consent and region but ` +
          `is sent with "Cache-Control: ${cacheControl}", so a shared cache can serve one ` +
          "visitor's banner to another. Prerender the page (`export const prerender = true`) to " +
          "share one HTML across visitors, or drop the shared-cache directive.",
      );
    }
    return false;
  }
  headers.set("cache-control", "private");
  const vary = headers.get("vary");
  if (!vary) headers.set("vary", "Cookie");
  else if (!/(^|,)\s*(cookie|\*)\s*(,|$)/i.test(vary)) headers.set("vary", `${vary}, Cookie`);
  return true;
}

/** @internal The parts of Astro's middleware context the handler uses. */
export type _Context = {
  request: Request;
  locals: object;
  isPrerendered: boolean;
};

/** @internal What the integration hands the middleware through its virtual module. */
export type _MiddlewareOptions = {
  config: CookieYesConfig;
  head: _HeadParts;
  dev: boolean;
};

/**
 * @internal The integration's middleware, ordered `pre` so it runs before the site's own:
 *
 * - `locals.cookieyes` is a getter that reads the request the first time something asks, so an
 *   endpoint that never asks costs nothing. A prerendered page gets the shared defaults and its
 *   build-time headers are never read.
 * - Every HTML response, prerendered ones included, gets the head tags after `<meta charset>`.
 *   Anything else, and HTML with no head such as a server island, passes through untouched.
 *
 * It inserts after `next()`, so it sees a nonce the site's own middleware set, in
 * `locals.cookieyes.nonce` or in the response's Content-Security-Policy header.
 */
export function _createHandler({ config, head, dev }: _MiddlewareOptions) {
  return async (context: _Context, next: () => Promise<Response>): Promise<Response> => {
    let locals: CookieYesLocals | undefined;
    Object.defineProperty(context.locals, "cookieyes", {
      configurable: true,
      enumerable: true,
      get: () => {
        locals ??= context.isPrerendered
          ? _defaultLocals(config)
          : _readRequestConsent(context.request.headers, config, dev);
        return locals;
      },
    });
    _setPageConfig(context.locals, config);

    const response = await next();
    const headers = new Headers(response.headers);
    // Per-visitor once the request was read: its consent and region decided this response.
    const personal = locals?.read === true;
    const changed = personal && markPrivate(headers, context.request, dev);
    const html = response.headers.get("content-type")?.includes("text/html");
    if (!response.body || !html) {
      if (!changed) return response;
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    const policy = response.headers.get("content-security-policy");
    const own = context.isPrerendered ? undefined : locals?.nonce;
    const markup = _headMarkup(head, {
      script: context.isPrerendered ? undefined : (own ?? _readNonce(policy, "script")),
      style: context.isPrerendered ? undefined : (own ?? _readNonce(policy, "style")),
    });
    // The body grows, so a length computed for the original would cut it short.
    headers.delete("content-length");
    return new Response(_insertHeadStream(response.body, markup), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
