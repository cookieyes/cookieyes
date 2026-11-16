import type { CookieYesConfig } from "@cookieyes/core";
import { bodyPortalRoot } from "@cookieyes/ui";
import type { Plugin } from "vue";
import { _RUNTIME_KEY } from "./keys.js";
import { _createRuntime, _tryGetCookieYes, type CookieYesRuntime } from "./runtime.js";

/**
 * Reuses the running runtime when the config object is the same one: a server calls `createApp`
 * per request, so `install` runs per request and must not rebuild the manager each time.
 */
function acquire(config: CookieYesConfig): CookieYesRuntime {
  const existing = _tryGetCookieYes();
  if (existing && existing.config === config) return existing;
  // Only in a browser: a server app written with an inline config object installs once per
  // request, and a warning there would repeat on every request.
  if (existing && typeof document !== "undefined") {
    console.warn(
      "[cookieyes] app.use(CookieYes) ran again with a different config. Replacing the previous runtime.",
    );
  }
  return _createRuntime(config);
}

/**
 * The Vue plugin. `app.use(CookieYes, config)` takes exactly the `CookieYesConfig` that
 * `@cookieyes/core` and `@cookieyes/react` take, starts the runtime and provides it to the app.
 * It registers no global components.
 */
export const CookieYes: Plugin<[CookieYesConfig]> = {
  install(app, config) {
    app.provide(_RUNTIME_KEY, acquire(config));

    // The banner and recall button teleport to this element by selector. Vue resolves a Teleport
    // target once at mount and does not re-resolve it when `disabled` flips, so the element has
    // to exist before `app.mount` or hydration rather than be created in `onMounted`; changing
    // `to` after hydration instead throws on Vue 3.5.0 to 3.5.27.
    if (typeof document !== "undefined") bodyPortalRoot();
  },
};
