import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import { type ConformanceDriver, pressInDocument } from "@cookieyes/test/conformance";
import { type App, createApp, createSSRApp, defineComponent, Fragment, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { getCookieYes, resetCookieYes } from "../runtime.js";

const Root = defineComponent({
  render: () =>
    h(Fragment, [
      h(CookieBanner),
      h(CookiePreferences),
      h(CookieOptOut),
      h(ReloadNotice),
      h(RecallButton),
    ]),
});

/**
 * Lets a state change and the render and portal move it causes finish. Not `flushPromises` from
 * Vue Test Utils: the browser run of this file cannot load that package.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await nextTick();
}

function clearPage(): void {
  resetCookieYes();
  _clearStopHandlers();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
}

/**
 * The Vue adapter as a conformance driver. How a click and a key press are delivered is the
 * caller's: simulated in jsdom, real in a browser.
 */
export function vueDriver(
  name: string,
  input: Pick<ConformanceDriver, "click" | "press"> = {
    click: async (el) => {
      (el as HTMLElement).click();
      await settle();
    },
    press: async (key) => {
      await pressInDocument(key);
      await settle();
    },
  },
): ConformanceDriver {
  let app: App | null = null;
  return {
    name,
    async mount(config: CookieYesConfig) {
      app = createApp(Root);
      app.use(CookieYes, config);
      const container = document.createElement("div");
      document.body.append(container);
      app.mount(container);
      // The banner moves into the portal root after mount, which is a second render.
      await settle();
    },
    unmount() {
      app?.unmount();
      app = null;
      clearPage();
    },
    async setLanguage(tag) {
      await getCookieYes().setLanguage(tag);
      await settle();
    },
    ...input,
    async serverHtml(config) {
      const app = createSSRApp(CookieBanner);
      app.use(CookieYes, config);
      try {
        return await renderToString(app);
      } finally {
        clearPage();
      }
    },
  };
}
