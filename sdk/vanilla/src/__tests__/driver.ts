import { type ConformanceDriver, pressInDocument } from "@cookieyes/test/conformance";
import { destroy, renderShell, start } from "../index.js";

function clearPage(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
}

/**
 * Vanilla as a conformance driver. How a click and a key press are delivered
 * is the caller's: simulated in jsdom, real in a browser.
 */
export function vanillaDriver(
  name: string,
  input: Pick<ConformanceDriver, "click" | "press"> = {
    click: async (el) => (el as HTMLElement).click(),
    press: pressInDocument,
  },
): ConformanceDriver {
  let runtime: ReturnType<typeof start> | null = null;
  return {
    name,
    mount(config) {
      runtime = start(config);
    },
    unmount() {
      destroy();
      runtime = null;
      clearPage();
    },
    async setLanguage(tag) {
      await runtime?.consentStore.setLanguage(tag);
    },
    ...input,
    serverHtml: renderShell,
  };
}
