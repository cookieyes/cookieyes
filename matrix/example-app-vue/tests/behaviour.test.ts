// matrix/example-app-vue/tests/behaviour.test.ts
//
// Client behaviour in jsdom, run inside the scratch project so it exercises this combination's
// installed Vue and @cookieyes/vue, never the repo's copies: `asChild` renders the developer's
// element and wires the consent action to it, and server-rendered markup hydrates without a
// mismatch warning (a hydration mismatch is the first thing a Vue version change breaks).

import { Banner, CookieYes, getCookieYes, readServerConsent, resetCookieYes } from "@cookieyes/vue";
import { afterEach, expect, test, vi } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import App from "../src/App.vue";
import { config } from "../src/consent";

afterEach(() => {
  resetCookieYes();
  document.body.innerHTML = "";
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
});

/** A macrotask turn, so effects queued on microtasks and timers have run. */
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

test("Banner asChild renders the developer's element with the part merged", async () => {
  const container = document.createElement("div");
  document.body.append(container);
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
  createApp(Root).use(CookieYes, config).mount(container);
  await settle();

  const node = document.querySelector('[data-testid="accept-native"]');
  expect(node?.tagName).toBe("A");
  expect(node?.getAttribute("data-cy-part")).toBe("accept-all");
  expect(document.querySelector('button[data-cy-part="accept-all"]')).toBeNull();
});

test("Banner asChild runs the consent action when the developer's element is clicked", async () => {
  const container = document.createElement("div");
  document.body.append(container);
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
  createApp(Root).use(CookieYes, config).mount(container);
  await settle();

  document.querySelector<HTMLButtonElement>('[data-testid="accept-native"]')?.click();
  await settle();

  expect(getCookieYes().getSnapshot().hasActed).toBe(true);
});

test("server-rendered markup hydrates without a mismatch warning", async () => {
  const props = {
    regulation: "GDPR" as const,
    initialConsent: readServerConsent("", { regulation: "GDPR" }),
  };
  const serverApp = createSSRApp(App, props).use(CookieYes, config);
  const html = await renderToString(serverApp);
  expect(html).toContain("data-cky-banner");
  // The browser is a different process from the server, so it starts with no runtime.
  resetCookieYes();

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  createSSRApp(App, props).use(CookieYes, config).mount(container);
  await settle();

  const vueWarnings = [...warn.mock.calls, ...error.mock.calls]
    .map((call) => call.map(String).join(" "))
    .filter((message) => message.includes("[Vue warn]"));
  warn.mockRestore();
  error.mockRestore();
  expect(vueWarnings).toEqual([]);
  expect(document.querySelector("[data-cky-banner]")).not.toBeNull();
});
