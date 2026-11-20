// matrix/example-app-svelte/tests/behaviour.test.ts
//
// Client behaviour in jsdom, run inside the scratch project so it exercises this combination's
// installed Svelte and @cookieyes/svelte, never the repo's copies: a `child` snippet renders the
// developer's element and wires the consent action to it, and server-rendered markup hydrates
// into the same DOM (a hydration mismatch is the first thing a Svelte version change breaks).

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { getCookieYes, resetCookieYes } from "@cookieyes/svelte";
import { flushSync, hydrate, mount, tick, unmount } from "svelte";
import { afterEach, expect, test, vi } from "vitest";
import App from "../src/App.svelte";
import AsChild from "./AsChild.svelte";

const mounted: Record<string, unknown>[] = [];

afterEach(async () => {
  for (const app of mounted.splice(0)) await unmount(app);
  resetCookieYes();
  document.body.innerHTML = "";
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
});

/** A few ticks, so effects and the banner's move into its portal have run. */
const settle = async () => {
  for (let i = 0; i < 4; i++) await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

function mountAsChild(tag: "a" | "button") {
  const target = document.createElement("div");
  document.body.append(target);
  mounted.push(mount(AsChild, { target, props: { tag } }));
  flushSync();
}

test("Banner child snippet renders the developer's element with the part merged", async () => {
  mountAsChild("a");
  await settle();

  const node = document.querySelector('[data-testid="accept-native"]');
  expect(node?.tagName).toBe("A");
  expect(node?.getAttribute("data-cy-part")).toBe("accept-all");
  expect(document.querySelector('button[data-cy-part="accept-all"]')).toBeNull();
});

test("Banner child snippet runs the consent action when the developer's element is clicked", async () => {
  mountAsChild("button");
  await settle();

  document.querySelector<HTMLButtonElement>('[data-testid="accept-native"]')?.click();
  await settle();

  expect(getCookieYes().getSnapshot().hasActed).toBe(true);
});

test("server-rendered markup hydrates into the same DOM", async () => {
  // The server entry is the built output of `vite build --ssr`, run in its own Node process: a
  // render happens where there is no `window`, as on a real server.
  const script =
    "const { render } = await import(process.argv[1]);" +
    "const out = await render({ cookieHeader: '', regulation: 'GDPR' });" +
    "process.stdout.write(JSON.stringify(out));";
  const entry = join(process.cwd(), "dist-ssr", "entry-server.js");
  const { html, initialConsent } = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script, entry], {
      encoding: "utf8",
    }),
  );
  expect(html).toContain("data-cky-banner");

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const atLoad = container.innerHTML;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  mounted.push(hydrate(App, { target: container, props: { regulation: "GDPR", initialConsent } }));
  // Before any effect has run: this is the DOM hydration itself produced. Svelte repairs a
  // mismatch silently, so a warning-free console alone would prove nothing.
  const afterHydrate = container.innerHTML;
  await settle();

  const svelteWarnings = [...warn.mock.calls, ...error.mock.calls]
    .map((call) => call.map(String).join(" "))
    .filter((message) => message.includes("hydration_mismatch"));
  warn.mockRestore();
  error.mockRestore();
  expect(svelteWarnings).toEqual([]);
  expect(afterHydrate).toBe(atLoad);
  expect(document.querySelector("[data-cky-banner]")).not.toBeNull();
});
