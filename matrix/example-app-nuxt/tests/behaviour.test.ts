// matrix/example-app-nuxt/tests/behaviour.test.ts
//
// Client behaviour inside this combination's Nuxt, through the module as an app uses it: the
// plugin starts the runtime, <CookieYesRoot /> and the headless parts come from auto-imports, and
// a decision made in the browser is written to the cookie the server reads on the next request.
// Runs in jsdom, so it does not prove hydration of the server HTML.

import { mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, expect, test } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { Banner, getCookieYes } from "#imports";
import App from "../app/app.vue";

const mounted: Array<{ unmount: () => void }> = [];

// The Nuxt environment starts one app, and so one runtime, for the whole file: each test starts
// again from a first-time visitor by resetting the decision rather than the runtime.
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  getCookieYes().manager.resetConsent();
});

/** A macrotask turn, so effects queued on microtasks and timers have run. */
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

test("CookieYesRoot shows the banner to a first-time visitor", async () => {
  const wrapper = await mountSuspended(App, { attachTo: document.body });
  mounted.push(wrapper);
  await settle();

  expect(document.querySelector('[data-cy-part="banner"]')).not.toBeNull();
});

test("accepting in the banner writes the consent cookie and hides the banner", async () => {
  const wrapper = await mountSuspended(App, { attachTo: document.body });
  mounted.push(wrapper);
  await settle();

  document.querySelector<HTMLButtonElement>('[data-cy-part="accept-all"]')?.click();
  await settle();

  expect(document.cookie).toMatch(/(?:^|;\s*)cookieyes-consent=/);
  expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
});

test("Banner asChild renders the developer's element with the part merged", async () => {
  const Root = defineComponent({
    render: () =>
      h(Banner.Root, null, {
        default: () =>
          h(
            Banner.AcceptAll,
            { asChild: true },
            {
              default: () => h("a", { href: "#accept", "data-testid": "accept-native" }, "Accept"),
            },
          ),
      }),
  });
  const wrapper = await mountSuspended(Root, { attachTo: document.body });
  mounted.push(wrapper);
  await settle();

  const node = document.querySelector('[data-testid="accept-native"]');
  expect(node?.tagName).toBe("A");
  expect(node?.getAttribute("data-cy-part")).toBe("accept-all");
});

test("Banner asChild runs the consent action when the developer's element is clicked", async () => {
  const Root = defineComponent({
    render: () =>
      h(Banner.Root, null, {
        default: () =>
          h(
            Banner.AcceptAll,
            { asChild: true },
            {
              default: () =>
                h("button", { type: "button", "data-testid": "accept-native" }, "Accept"),
            },
          ),
      }),
  });
  const wrapper = await mountSuspended(Root, { attachTo: document.body });
  mounted.push(wrapper);
  await settle();

  document.querySelector<HTMLButtonElement>('[data-testid="accept-native"]')?.click();
  await settle();

  expect(getCookieYes().getSnapshot().hasActed).toBe(true);
});
