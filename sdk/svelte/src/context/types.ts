import type { ConsentSnapshot, CookieYesConfig, RegionConfig, Regulation } from "@cookieyes/core";

/**
 * The props of `<CookieYesProvider>`. `region`, `regulation`, `initialConsent` and `forcedRegion`
 * are read again whenever they change, so a value that comes from the request stays current.
 */
export type CookieYesProviderProps = {
  /**
   * The same `CookieYesConfig` that `@cookieyes/core` and `@cookieyes/react` take. The provider
   * starts the runtime from it, or reuses the running one when it is the same object, so a server
   * that renders per request should import one module-level config rather than write it inline.
   */
  config: CookieYesConfig;
  /**
   * The region config the regulation is resolved from. Defaults to `config.region`. Resolved per
   * render, so on the server it uses the request's region and the banner is rendered with the
   * correct regulation.
   */
  region?: RegionConfig | undefined;
  /**
   * A fixed regulation. When both `region` and `regulation` are given, `regulation` wins.
   * Defaults to `config.regulation`.
   */
  regulation?: Regulation | undefined;
  /**
   * A returning visitor's stored consent, read from the request on the server with
   * `readServerConsent()`. With it the banner is never rendered for them, rather than rendered
   * and removed after hydration. It is a prop and not part of the config because the runtime is
   * shared across concurrent server requests, so per-visitor consent kept there would leak.
   */
  initialConsent?: ConsentSnapshot | null | undefined;
  /**
   * Dev-only: a `forceRegion` override already resolved on the server from the request's
   * `__cyd_region` cookie, so the server-rendered banner matches it. Ignored in production.
   */
  forcedRegion?: string | undefined;
};
