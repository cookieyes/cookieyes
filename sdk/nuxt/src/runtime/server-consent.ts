import {
  type ConsentSnapshot,
  type CookieYesConfig,
  readServerConsent,
  regionFromHeaders,
  resolveRegion,
} from "@cookieyes/vue";

declare const process: { env: { NODE_ENV?: string } };

/** @internal What the server learned about the visitor, handed to the client in the payload. */
export type _RequestConsent = {
  /**
   * Whether the server read this visitor's request. False for a client-only render and for a
   * shared one (a cached or prerendered route), where nothing personal may be in the HTML.
   */
  read: boolean;
  initialConsent: ConsentSnapshot | null;
  /** Region from the Vercel or Cloudflare geo headers, for example "US-CA". */
  region: string | undefined;
  /** The DevTools region override from the `__cyd_region` cookie. Always undefined in production. */
  forcedRegion: string | undefined;
};

/**
 * @internal Whether Nuxt renders this route once and serves the HTML to every visitor: `swr`,
 * `isr`, `cache` or `prerender` route rules. Such a page must not carry one visitor's consent or
 * region, or the next visitor would get it: someone who never chose could get no banner, or a
 * visitor in Europe the CCPA one. Next.js needs no such check because reading cookies makes a
 * route dynamic there; Nuxt caches whatever a route rule says.
 */
export function _isSharedRender(rules: Readonly<Record<string, unknown>>): boolean {
  return Boolean(rules.swr || rules.isr || rules.cache || rules.prerender);
}

/** @internal The state before, or without, a request: a client-only or prerendered render. */
export function _emptyRequestConsent(): _RequestConsent {
  return { read: false, initialConsent: null, region: undefined, forcedRegion: undefined };
}

/**
 * @internal The config for the browser's consent runtime. When the server read the request, its
 * region replaces any configured detector, as `@cookieyes/nextjs` documents for `initCookieYes`:
 * the runtime picks its regulation once, at start, and that regulation decides what loads and what
 * the cookie records. It must be the one the banner shows. Without this, a visitor shown the GDPR
 * banner could run under a CCPA runtime that grants everything before they choose.
 */
export function _withRequestRegion(
  config: CookieYesConfig,
  request: _RequestConsent,
): CookieYesConfig {
  if (!config.region || !request.read) return config;
  const region = request.region;
  return { ...config, region: { ...config.region, detect: () => region } };
}

function readForcedRegion(cookieHeader: string): string | undefined {
  const match = /(?:^|;\s*)__cyd_region=([^;]*)/.exec(cookieHeader);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    // A malformed cookie value is ignored rather than failing the request.
    return undefined;
  }
}

/**
 * @internal Reads a request's headers the way `@cookieyes/nextjs`'s `getServerConsent()` and
 * `getServerRegion()` do: the consent cookie, the Vercel and Cloudflare geo headers through core's
 * `regionFromHeaders`, and in development the DevTools region cookie.
 *
 * The stored decision is read under the regulation the provider will resolve for this visitor,
 * so the server snapshot and the client's first render agree.
 */
export function _readRequestConsent(
  headers: Readonly<Record<string, string | undefined>>,
  config: CookieYesConfig,
): _RequestConsent {
  const cookieHeader = headers.cookie ?? "";
  const region = regionFromHeaders({ get: (name: string) => headers[name.toLowerCase()] ?? null });

  let forcedRegion: string | undefined;
  // Dev-only: written as the exact literal so bundlers drop the reader from a production build.
  if (process.env.NODE_ENV !== "production") forcedRegion = readForcedRegion(cookieHeader);

  // A manual regulation wins outright, as in the provider; skipping resolveRegion then also
  // avoids repeating its "both set" warning on every request.
  const regulation =
    config.regulation ??
    (config.region
      ? resolveRegion({ ...config.region, detect: () => region }, undefined, forcedRegion)
          .regulation
      : undefined);
  const initialConsent = readServerConsent(cookieHeader, {
    regulation,
    categories: config.categories,
  });
  return { read: true, initialConsent, region, forcedRegion };
}
