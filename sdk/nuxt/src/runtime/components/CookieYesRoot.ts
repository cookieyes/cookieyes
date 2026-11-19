import type { CookieYesConfig } from "@cookieyes/vue";
import {
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  CookieYesProvider,
  RecallButton,
} from "@cookieyes/vue";
import { useNuxtApp, useState } from "nuxt/app";
import { computed, defineComponent, h, inject, onMounted, shallowRef } from "vue";
import { _CONFIG_KEY } from "../config.js";
import { _emptyRequestConsent, type _RequestConsent } from "../server-consent.js";

/**
 * @internal Whether a CCPA regulation can apply to some visitor, so the opt-out dialog that the
 * banner's Do Not Sell button opens has to be rendered.
 */
export function _canBeCcpa(config: CookieYesConfig): boolean {
  return (
    config.regulation === "CCPA" ||
    config.region?.strictest === "CCPA" ||
    Object.values(config.region?.map ?? {}).includes("CCPA")
  );
}

/**
 * The whole consent UI, wired to what the server read from the request: the banner, the
 * preferences dialog, the recall button and, when a CCPA regulation can apply, the opt-out
 * dialog. Put it once in `app.vue`, outside `<NuxtPage />`, so it survives navigation. A default
 * slot replaces the contents for a custom layout; it renders inside the same provider.
 */
export default defineComponent({
  name: "CookieYesRoot",
  setup(_props, { slots }) {
    const config = inject(_CONFIG_KEY);
    if (!config) {
      throw new Error("[cookieyes] <CookieYesRoot /> needs the @cookieyes/nuxt module in modules.");
    }
    const state = useState<_RequestConsent>("cookieyes:request", _emptyRequestConsent);

    // When the server read the request, its geo headers are the only source of the region, on
    // both sides, so the first client render resolves the regulation the server rendered and the
    // runtime runs under (see _withRequestRegion). A shared render (cached or prerendered) read
    // nothing: the server renders the strictest regulation, the hydrating client does the same,
    // and the configured detector, which may read browser-only signals, takes over once mounted.
    const live = shallowRef(!import.meta.server && !useNuxtApp().isHydrating);
    onMounted(() => {
      live.value = true;
    });
    const region = computed(() => {
      const configured = config.region;
      if (!configured) return undefined;
      const { read, region: fromRequest } = state.value;
      if (read) return { ...configured, detect: () => fromRequest };
      return live.value ? configured : { ...configured, detect: () => undefined };
    });

    const canBeCcpa = _canBeCcpa(config);

    return () =>
      h(
        CookieYesProvider,
        {
          initialConsent: state.value.initialConsent,
          ...(region.value ? { region: region.value } : {}),
          ...(config.regulation ? { regulation: config.regulation } : {}),
          ...(state.value.forcedRegion ? { forcedRegion: state.value.forcedRegion } : {}),
        },
        {
          default: () =>
            slots.default?.() ?? [
              h(CookieBanner),
              h(CookiePreferences),
              canBeCcpa ? h(CookieOptOut) : null,
              h(RecallButton),
            ],
        },
      );
  },
});
