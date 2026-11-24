// matrix/example-app-sveltekit/tests/behaviour.test.ts
//
// Client behaviour in jsdom, run inside the scratch project so it exercises this combination's
// installed SvelteKit, Svelte and @cookieyes/sveltekit, never the repo's copies: <CookieYesRoot>
// shows the banner and writes the decision to the cookie the server reads on the next request, and
// a `child` snippet renders the developer's element with the consent action wired to it. Hydration
// of the server HTML is covered by the HTTP assertions, not here.

import { getCookieYes } from "@cookieyes/sveltekit";
import { flushSync, mount, tick, unmount } from "svelte";
import { afterEach, expect, test } from "vitest";
import { config } from "../src/lib/cookieyes";
import AsChild from "./AsChild.svelte";
import Root from "./Root.svelte";

const mounted: Record<string, unknown>[] = [];

afterEach(async () => {
  for (const app of mounted.splice(0)) await unmount(app);
  getCookieYes().manager.resetConsent();
  document.body.innerHTML = "";
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
});

/** A few ticks, so effects and the banner's move into its portal have run. */
const settle = async () => {
  for (let i = 0; i < 4; i++) await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

function host() {
  const target = document.createElement("div");
  document.body.append(target);
  return target;
}

function mountRoot() {
  mounted.push(mount(Root, { target: host(), props: { config } }));
  flushSync();
}

function mountAsChild(tag: "a" | "button") {
  mounted.push(mount(AsChild, { target: host(), props: { tag } }));
  flushSync();
}

test("CookieYesRoot shows the banner to a first-time visitor", async () => {
  mountRoot();
  await settle();

  expect(document.querySelector('[data-cy-part="banner"]')).not.toBeNull();
});

test("accepting in the banner writes the consent cookie and hides the banner", async () => {
  mountRoot();
  await settle();

  document.querySelector<HTMLButtonElement>('[data-cy-part="accept-all"]')?.click();
  await settle();

  expect(document.cookie).toMatch(/(?:^|;\s*)cookieyes-consent=/);
  expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
});

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
