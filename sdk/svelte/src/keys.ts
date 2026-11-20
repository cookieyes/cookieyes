import type { ConsentSnapshot, RegionDecision } from "@cookieyes/core";
import type { CookieYesRuntime } from "./runtime.js";

/** @internal The runtime `<CookieYesProvider>` provides to everything below it. */
export const _RUNTIME_KEY: symbol = Symbol("cookieyes-runtime");

/** @internal Getter for the region decision `<CookieYesProvider>` resolved for this render. */
export const _REGION_KEY: symbol = Symbol("cookieyes-region");

/**
 * @internal Getter for a returning visitor's stored consent supplied by `<CookieYesProvider>`.
 * Provided through context, never stored on the runtime: the runtime is shared across concurrent
 * server requests.
 */
export const _SSR_CONSENT_KEY: symbol = Symbol("cookieyes-ssr-consent");

/**
 * @internal Getter that is false on the server and during the hydrating render, then true once
 * the provider has mounted. Hooks read the server snapshot until it flips.
 */
export const _LIVE_KEY: symbol = Symbol("cookieyes-live");

/** @internal The shapes behind the keys above. */
export type ProviderContext = {
  runtime: CookieYesRuntime;
  region: () => RegionDecision;
  ssrConsent: () => ConsentSnapshot | null;
  live: () => boolean;
};

/** @internal Private to `Preferences.*`: the dialog's shared title id. */
export const _PREFERENCES_ROOT: symbol = Symbol("cookieyes-preferences-root");

/** @internal Private to `OptOut.*`: the dialog's state, its reducer and its shared title id. */
export const _OPT_OUT_ROOT: symbol = Symbol("cookieyes-opt-out-root");
