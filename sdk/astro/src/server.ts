import { type ConsentSnapshot, readServerConsent, regionFromHeaders } from "@cookieyes/core";
import type { CookieYesLocals } from "./server-consent.js";

/** Which request header (name and the value it carried) gave the region. */
export type ServerDrivingSignal = { header: string; value: string };

/** What `getServerRegion` reports: the same shape as `@cookieyes/nextjs/server`'s. */
export type ServerRegionInfo = {
  /** Region read from the request's geo headers, for example "US-CA", if any. */
  region: string | undefined;
  /** The header that supplied `region`, or undefined when no known geo header was present. */
  drivingSignal: ServerDrivingSignal | undefined;
  /** Whether the request sent the `Sec-GPC: 1` signal. */
  gpc: boolean;
  /** The DevTools region override from the `__cyd_region` cookie. Always undefined outside dev. */
  forcedRegion: string | undefined;
};

/** `Astro` in a page or component, or the context in an endpoint or middleware. */
type Context = { locals: object; request: Request };

const GEO_HEADERS: ReadonlyArray<{ country: string; region?: string }> = [
  { country: "x-vercel-ip-country", region: "x-vercel-ip-country-region" },
  { country: "cf-ipcountry" },
];

function localsOf(context: Context): CookieYesLocals | undefined {
  return (context.locals as { cookieyes?: CookieYesLocals }).cookieyes;
}

/**
 * The visitor's stored decision, or null when they have not chosen, as `@cookieyes/nextjs`'s
 * `getServerConsent()` returns it. Takes the context explicitly, because Astro has no request
 * global. Always null on a prerendered page, whose HTML every visitor shares.
 *
 * @example const consent = getServerConsent(Astro);
 */
export function getServerConsent(context: Context): ConsentSnapshot | null {
  return localsOf(context)?.initialConsent ?? null;
}

/**
 * The visitor's region from the Vercel or Cloudflare geo headers, with the header that gave it,
 * as `@cookieyes/nextjs`'s `getServerRegion()` reports it. Empty on a prerendered page: its
 * build-time headers are never read.
 *
 * @example const { region } = getServerRegion(Astro);
 */
export function getServerRegion(context: Context): ServerRegionInfo {
  const locals = localsOf(context);
  if (!locals?.read) {
    return { region: undefined, drivingSignal: undefined, gpc: false, forcedRegion: undefined };
  }
  const headers = context.request.headers;
  let drivingSignal: ServerDrivingSignal | undefined;
  for (const { country, region } of GEO_HEADERS) {
    const countryCode = headers.get(country);
    if (!countryCode) continue;
    const regionCode = region ? headers.get(region) : null;
    drivingSignal = regionCode
      ? { header: region as string, value: regionCode }
      : { header: country, value: countryCode };
    break;
  }
  return {
    region: locals.region,
    drivingSignal,
    gpc: locals.gpc,
    forcedRegion: locals.forcedRegion,
  };
}

export type { CookieYesLocals } from "./server-consent.js";
export { readServerConsent, regionFromHeaders };
