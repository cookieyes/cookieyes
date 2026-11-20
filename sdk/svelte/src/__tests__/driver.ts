import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import { type ConformanceDriver, pressInDocument } from "@cookieyes/test/conformance";
import { mount, tick, unmount } from "svelte";
import { getCookieYes, resetCookieYes } from "../runtime.js";
import Everything from "./fixtures/Everything.svelte";
import Harness from "./fixtures/Harness.svelte";

/**
 * Lets a state change and the render and portal move it causes finish. Not `settle` from
 * `test-utils.ts`: the browser run of this file cannot load `@testing-library/svelte`.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await tick();
}

function clearPage(): void {
  resetCookieYes();
  _clearStopHandlers();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
}

/**
 * The Svelte adapter as a conformance driver. How a click and a key press are delivered is the
 * caller's: simulated in jsdom, real in a browser. A server render needs a Node process with no
 * DOM, which a browser run does not have, so `serverHtml` is given only where there is one.
 */
export function svelteDriver(
  name: string,
  input: Pick<ConformanceDriver, "click" | "press" | "serverHtml"> = {
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
  let app: ReturnType<typeof mount> | null = null;
  return {
    name,
    async mount(config: CookieYesConfig) {
      const container = document.createElement("div");
      document.body.append(container);
      app = mount(Harness, { target: container, props: { config, component: Everything } });
      // The banner moves into the portal root after mount, which is a second step.
      await settle();
    },
    async unmount() {
      if (app) await unmount(app);
      app = null;
      clearPage();
    },
    async setLanguage(tag) {
      await getCookieYes().setLanguage(tag);
      await settle();
    },
    ...input,
  };
}
