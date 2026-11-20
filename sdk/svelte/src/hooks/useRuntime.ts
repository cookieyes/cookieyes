import { getContext } from "svelte";
import {
  _LIVE_KEY,
  _REGION_KEY,
  _RUNTIME_KEY,
  _SSR_CONSENT_KEY,
  type ProviderContext,
} from "../keys.js";

/**
 * @internal Reads what `<CookieYesProvider>` supplied, or throws the one error that names the fix.
 * A missing provider is a setup bug, so unlike React's hooks nothing degrades silently. `name` is
 * a hook name such as `useConsent`, or a component written `<CookieBanner>`.
 */
export function _useContext(name: string): ProviderContext {
  const label = name.startsWith("<") ? name : `${name}()`;
  const message = `[cookieyes] ${label} could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.`;
  let runtime: ProviderContext["runtime"] | undefined;
  try {
    runtime = getContext<ProviderContext["runtime"] | undefined>(_RUNTIME_KEY);
  } catch {
    // Svelte throws its own error outside component initialisation, which does not say how to
    // fix a hook called from an event handler or a module.
    throw new Error(message);
  }
  if (!runtime) throw new Error(message);
  return {
    runtime,
    region: getContext<ProviderContext["region"]>(_REGION_KEY),
    ssrConsent: getContext<ProviderContext["ssrConsent"]>(_SSR_CONSENT_KEY),
    live: getContext<ProviderContext["live"]>(_LIVE_KEY),
  };
}

/** @internal The runtime `<CookieYesProvider>` started. */
export function _useRuntime(name: string): ProviderContext["runtime"] {
  return _useContext(name).runtime;
}
