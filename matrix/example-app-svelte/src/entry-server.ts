// matrix/example-app-svelte/src/entry-server.ts
//
// Built with `vite build --ssr` and imported by tests/ssr.assert.mjs, which calls `render` once per
// visitor. It returns the consent it read next to the HTML so the assertion can check the value
// the server decided on, not only whether the banner is present.

import { type ConsentSnapshot, type Regulation, readServerConsent } from "@cookieyes/svelte";
import { render as renderApp } from "svelte/server";
import App from "./App.svelte";

export async function render(options: {
  cookieHeader: string;
  regulation: Regulation;
}): Promise<{ html: string; head: string; initialConsent: ConsentSnapshot | null }> {
  const initialConsent = readServerConsent(options.cookieHeader, {
    regulation: options.regulation,
  });
  const output = await renderApp(App, {
    props: { regulation: options.regulation, initialConsent },
  });
  // From Svelte 5.58 the result is lazy, so `body` and `head` are read by name, never spread.
  return { html: output.body, head: output.head, initialConsent };
}
