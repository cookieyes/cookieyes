import {
  type ConsentSnapshot,
  type CookieYesConfig,
  type Regulation,
  readServerConsent,
  regionFromHeaders,
  resolveCategories,
  resolveRegion,
} from "@cookieyes/core";

/**
 * `Astro.locals.cookieyes`: what the server learned about this request. Typed in every project
 * that adds the integration, with no edit to `env.d.ts`.
 */
export type CookieYesLocals = {
  /**
   * Whether the request was read. False on a prerendered page, whose HTML every visitor shares, so
   * nothing personal may be in it.
   */
  read: boolean;
  /** The visitor's stored decision, or null when they have not chosen (or it was not read). */
  initialConsent: ConsentSnapshot | null;
  /**
   * Category id to granted: the stored decision, otherwise only the required categories. An
   * undecided CCPA visitor also gets required-only, although the runtime grants the rest
   * implicitly, because a template that gates on this must never show a grant it cannot see.
   */
  categories: Record<string, boolean>;
  /** Region from the Vercel or Cloudflare geo headers, for example "US-CA". */
  region: string | undefined;
  /** The regulation the banner on this page uses. */
  regulation: Regulation;
  /** Whether the request sent `Sec-GPC: 1`. */
  gpc: boolean;
  /** The DevTools region override from the `__cyd_region` cookie. Always undefined outside dev. */
  forcedRegion: string | undefined;
  /**
   * A nonce for the head tags, for a policy your own middleware sets. Set it in a middleware that
   * runs after the integration's; without it the nonce is read from the response's
   * `Content-Security-Policy` header.
   */
  nonce?: string | undefined;
};

// Read directly rather than through core's `_normalizeConfig`, which warns when both spellings are
// set: once per request would flood a server log.
function manualRegulation(config: CookieYesConfig): Regulation | undefined {
  return config.regulation ?? config.overrides?.regulation;
}

function requiredOnly(config: CookieYesConfig): Record<string, boolean> {
  const resolved = resolveCategories(config.categories);
  const categories: Record<string, boolean> = {};
  for (const id of resolved.ids) categories[id] = resolved.requiredIds.has(id);
  return categories;
}

/**
 * @internal The regulation a page shared by every visitor is rendered under: the configured one,
 * else the strictest of the region config, as the runtime resolves an unknown region. The browser
 * then detects the visitor's own and redraws the banner if it differs.
 */
export function _sharedRegulation(config: CookieYesConfig): Regulation {
  const regulation = manualRegulation(config);
  if (regulation) return regulation;
  return config.region
    ? resolveRegion({ ...config.region, detect: () => undefined }).regulation
    : "DEFAULT";
}

/**
 * @internal The locals of a prerendered page: nothing read, required categories only, and the
 * strictest regulation. Headers are never touched, because at build time they are not a visitor's.
 */
export function _defaultLocals(config: CookieYesConfig): CookieYesLocals {
  return {
    read: false,
    initialConsent: null,
    categories: requiredOnly(config),
    region: undefined,
    regulation: _sharedRegulation(config),
    gpc: false,
    forcedRegion: undefined,
  };
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
 * `regionFromHeaders`, `Sec-GPC`, and in development the DevTools region cookie. `dev` comes from
 * the caller, because the integration knows it and a server bundle may not fold a
 * `process.env.NODE_ENV` check.
 *
 * The stored decision is read under the regulation the runtime will resolve for this visitor,
 * so the server HTML and the browser agree.
 */
export function _readRequestConsent(
  headers: Headers,
  config: CookieYesConfig,
  dev: boolean,
): CookieYesLocals {
  const cookieHeader = headers.get("cookie") ?? "";
  const region = regionFromHeaders(headers);
  const forcedRegion = dev ? readForcedRegion(cookieHeader) : undefined;

  // A manual regulation wins outright, as in the runtime; skipping resolveRegion then also avoids
  // repeating its "both set" warning on every request.
  const regulation: Regulation =
    manualRegulation(config) ??
    (config.region
      ? resolveRegion({ ...config.region, detect: () => region }, undefined, forcedRegion)
          .regulation
      : "DEFAULT");
  const initialConsent = readServerConsent(cookieHeader, {
    regulation,
    categories: config.categories,
  });
  return {
    read: true,
    initialConsent,
    categories: initialConsent ? initialConsent.categories : requiredOnly(config),
    region,
    regulation,
    gpc: headers.get("sec-gpc") === "1",
    forcedRegion,
  };
}

/**
 * @internal Whether a CCPA regulation can apply to some visitor, so the opt-out dialog that the
 * banner's Do Not Sell button opens has to be drawn.
 */
export function _canBeCcpa(config: CookieYesConfig): boolean {
  return (
    manualRegulation(config) === "CCPA" ||
    config.region?.strictest === "CCPA" ||
    Object.values(config.region?.map ?? {}).includes("CCPA")
  );
}
