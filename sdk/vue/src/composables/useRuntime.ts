import { getCurrentInstance, hasInjectionContext, inject } from "vue";
import { _RUNTIME_KEY } from "../keys.js";
import type { CookieYesRuntime } from "../runtime.js";

/**
 * @internal Injects the runtime the plugin provided, or throws the one error that names the fix.
 * A missing plugin is a setup bug, so unlike React's hooks nothing degrades silently. `name` is
 * a composable name such as `useConsent`, or a component written `<CookieBanner>`.
 */
export function _useRuntime(name: string): CookieYesRuntime {
  const label = name.startsWith("<") ? name : `${name}()`;
  const head = `[cookieyes] ${label} could not find CookieYes. Add app.use(CookieYes, config) before mounting the app`;
  if (!getCurrentInstance() && !hasInjectionContext()) {
    throw new Error(`${head}, and call composables inside setup() or app.runWithContext().`);
  }
  const runtime = inject(_RUNTIME_KEY, null);
  if (!runtime) throw new Error(`${head}.`);
  return runtime;
}
