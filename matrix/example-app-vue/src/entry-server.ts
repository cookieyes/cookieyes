// matrix/example-app-vue/src/entry-server.ts
//
// Built with `vite build --ssr` and imported by tests/ssr.assert.mjs, which calls `render` once per
// visitor. It returns the consent it read next to the HTML so the assertion can check the value
// the server decided on, not only whether the banner is present.

import {
  type ConsentSnapshot,
  CookieYes,
  type Regulation,
  readServerConsent,
} from "@cookieyes/vue";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import App from "./App.vue";
import { config } from "./consent";

export async function render(options: {
  cookieHeader: string;
  regulation: Regulation;
}): Promise<{ html: string; initialConsent: ConsentSnapshot | null }> {
  const initialConsent = readServerConsent(options.cookieHeader, {
    regulation: options.regulation,
  });
  const app = createSSRApp(App, { regulation: options.regulation, initialConsent });
  app.use(CookieYes, config);
  return { html: await renderToString(app), initialConsent };
}
