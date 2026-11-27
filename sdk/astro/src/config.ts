import type { CookieYesConfig } from "@cookieyes/core";

/**
 * @internal Lists the dotted paths of every function inside `value`. Used to warn when an option
 * that holds a function was put in `astro.config.mjs`, where it cannot reach the server or the
 * browser: both receive the config as JSON.
 */
export function _findFunctionPaths(value: unknown, path: string): string[] {
  if (typeof value === "function") return [path];
  if (value === null || typeof value !== "object") return [];
  const found: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    found.push(
      ..._findFunctionPaths(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`),
    );
  }
  return found;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @internal Merges the options from `astro.config.mjs` (JSON only) with those from
 * `src/cookieyes.client.ts` (which may hold functions), by `@cookieyes/nuxt`'s rule: the client
 * file wins per key, and one level of nesting is merged, so `region.map` in one file and
 * `region.detect` in the other both survive. Arrays are replaced, not concatenated.
 */
export function _mergeConfig(
  fromAstroConfig: Partial<CookieYesConfig> | undefined,
  fromClientFile: Partial<CookieYesConfig> | undefined,
): CookieYesConfig {
  const merged: Record<string, unknown> = { ...fromAstroConfig };
  for (const [key, value] of Object.entries(fromClientFile ?? {})) {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value) ? { ...current, ...value } : value;
  }
  return merged as CookieYesConfig;
}

/**
 * @internal What the server learned about the request, as the page hands it to the browser.
 * `forcedRegion` is the DevTools override, present only when the server honoured it, which it
 * does in development only.
 */
export type _RequestRegion = {
  read: boolean;
  region: string | undefined;
  forcedRegion?: string | undefined;
};

/**
 * @internal The config for the browser's consent runtime. When the server read the request, its
 * region replaces any configured detector, as `@cookieyes/nextjs` documents for `initCookieYes`:
 * the runtime picks its regulation once, at start, and that regulation decides what loads and what
 * the cookie records. It must be the one the banner shows. Without this, a visitor shown the GDPR
 * banner could run under a CCPA runtime that grants everything before they choose.
 */
export function _withRequestRegion(
  config: CookieYesConfig,
  request: _RequestRegion,
): CookieYesConfig {
  if (!config.region || !request.read) return config;
  // The DevTools override wins, as it did on the server, so the runtime's regulation matches the
  // banner the server drew under it.
  const region = request.forcedRegion ?? request.region;
  return { ...config, region: { ...config.region, detect: () => region } };
}
