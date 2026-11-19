import { CookieYes, type CookieYesConfig } from "@cookieyes/vue";
import {
  defineNuxtPlugin,
  getRouteRules,
  useAppConfig,
  useRequestHeaders,
  useRequestURL,
  useRuntimeConfig,
  useState,
} from "nuxt/app";
import { _CONFIG_KEY, _resolveConfig } from "./config.js";
import {
  _emptyRequestConsent,
  _isSharedRender,
  type _RequestConsent,
  _readRequestConsent,
  _withRequestRegion,
} from "./server-consent.js";

/**
 * Starts the SDK on both sides. On the server it also reads the visitor's request, and the
 * result travels to the browser in the Nuxt payload, so the client's first render uses the same
 * consent and region as the server HTML: no hydration mismatch, and no banner flash for a
 * returning visitor.
 */
export default defineNuxtPlugin({
  name: "cookieyes",
  enforce: "pre",
  setup(nuxtApp) {
    const config = _resolveConfig(
      useRuntimeConfig().public.cookieyes as Partial<CookieYesConfig> | undefined,
      (useAppConfig() as { cookieyes?: Partial<CookieYesConfig> }).cookieyes,
    );
    const state = useState<_RequestConsent>("cookieyes:request", _emptyRequestConsent);
    // A cached or prerendered route keeps the visitor-neutral state, as a static page does: the
    // banner is in the HTML for everyone and the browser decides.
    if (import.meta.server && !_isSharedRender(getRouteRules(useRequestURL().pathname))) {
      state.value = _readRequestConsent(useRequestHeaders(), config);
    }

    // The server's runtime is shared by every request, so only the browser's runtime takes this
    // visitor's region; on the server the provider in <CookieYesRoot /> renders it per request.
    nuxtApp.vueApp.use(
      CookieYes,
      import.meta.server ? config : _withRequestRegion(config, state.value),
    );
    nuxtApp.vueApp.provide(_CONFIG_KEY, config);
  },
});
