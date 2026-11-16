import type { ConsentSnapshot, RegionDecision } from "@cookieyes/core";
import type { ComputedRef, InjectionKey } from "vue";
import type { CookieYesRuntime } from "./runtime.js";

/** @internal The runtime `app.use(CookieYes, config)` provides to the app. */
export const _RUNTIME_KEY: InjectionKey<CookieYesRuntime> = Symbol("cookieyes-runtime");

/** @internal Per-request region decision supplied by `<CookieYesProvider>`. */
export const _REGION_KEY: InjectionKey<ComputedRef<RegionDecision>> = Symbol("cookieyes-region");

/**
 * @internal A returning visitor's stored consent supplied by `<CookieYesProvider>`. Provided and
 * injected, never stored on the runtime: the runtime is shared across concurrent server requests.
 */
export const _SSR_CONSENT_KEY: InjectionKey<ComputedRef<ConsentSnapshot | null>> =
  Symbol("cookieyes-ssr-consent");
