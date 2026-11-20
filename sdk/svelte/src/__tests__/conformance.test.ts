// The Svelte adapter against the same conformance suite React and vanilla pass, in jsdom, on
// every test run. `conformance.browser.test.ts` runs it in a real browser.
import { pressInDocument, runConformance } from "@cookieyes/test/conformance";
import { tick } from "svelte";
import { describe, it } from "vitest";
import { svelteDriver } from "./driver.js";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";

useServerRenderer();

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await tick();
}

runConformance(
  svelteDriver("svelte (jsdom)", {
    click: async (el) => {
      (el as HTMLElement).click();
      await settle();
    },
    press: async (key) => {
      await pressInDocument(key);
      await settle();
    },
    serverHtml: async (config) => {
      const { body } = await renderOnServer({
        parts: ["banner"],
        ...(config.regulation ? { regulation: config.regulation } : {}),
      });
      return body;
    },
  }),
  { describe, it },
);
