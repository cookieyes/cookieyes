import {
  type ConsentSnapshot,
  type CookieYesConfig,
  readServerConsent,
  regionFromHeaders,
  resolveRegion,
} from "@cookieyes/svelte";
import { dev } from "$app/environment";

/**
 * What the server learned about one request. Plain data: it crosses into `data` through devalue,
 * so it holds nothing that function or class instances would break.
 */
export type CookieYesRequestState = {
  /**
   * False for a build-time (prerendered) render, where nothing personal may enter the HTML, and
   * for a page rendered without a state.
   */
  read: boolean;
  /** The visitor's stored decision, or null when they have not chosen. */
  initialConsent: ConsentSnapshot | null;
  /** Region from the Vercel or Cloudflare geo headers, for example "US-CA". */
  region: string | undefined;
  /** The DevTools region override from the `__cyd_region` cookie. Always undefined outside the dev server. */
  forcedRegion: string | undefined;
};

/** `event.locals.cookieyes`. `gpc` stays on the server and is not sent to the browser. */
export type CookieYesLocals = CookieYesRequestState & { gpc: boolean };

/** @internal The state before, or without, a request: a prerendered or client-only render. */
export function _emptyRequestState(): CookieYesRequestState {
  return { read: false, initialConsent: null, region: undefined, forcedRegion: undefined };
}

/**
 * @internal Whether a CCPA regulation can apply to some visitor, so the opt-out dialog that the
 * banner's Do Not Sell button opens has to be rendered.
 */
export function _canBeCcpa(config: CookieYesConfig): boolean {
  return (
    (config.regulation ?? config.overrides?.regulation) === "CCPA" ||
    config.region?.strictest === "CCPA" ||
    Object.values(config.region?.map ?? {}).includes("CCPA")
  );
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
  request: CookieYesRequestState,
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
 * `regionFromHeaders`, `Sec-GPC`, and in development the DevTools region cookie.
 *
 * The stored decision is read under the regulation the provider will resolve for this visitor,
 * so the server snapshot and the client's first render agree.
 */
export function _readRequestConsent(headers: Headers, config: CookieYesConfig): CookieYesLocals {
  const cookieHeader = headers.get("cookie") ?? "";
  const region = regionFromHeaders(headers);

  let forcedRegion: string | undefined;
  // Gated on Kit's `dev`, not `process.env.NODE_ENV`: the Kit server build keeps that expression as a
  // runtime read, so a deployment started without NODE_ENV would honour a visitor-set cookie.
  if (dev) forcedRegion = readForcedRegion(cookieHeader);

  // A manual regulation (or its deprecated `overrides.regulation` alias) wins outright, as in the provider; skipping resolveRegion then also
  // avoids repeating its "both set" warning on every request.
  const regulation =
    config.regulation ??
    config.overrides?.regulation ??
    (config.region
      ? resolveRegion({ ...config.region, detect: () => region }, undefined, forcedRegion)
          .regulation
      : undefined);
  const initialConsent = readServerConsent(cookieHeader, {
    regulation,
    categories: config.categories,
  });
  return {
    read: true,
    initialConsent,
    region,
    forcedRegion,
    gpc: headers.get("sec-gpc") === "1",
  };
}
