import { readServerConsent } from "@cookieyes/svelte";
import type { hydrate } from "svelte";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieYesRequestState } from "../server-consent.js";
import { type PageSpec, renderOnServer, useServerRenderer } from "./ssr-render.js";

/**
 * The root, rendered on a server (a separate process with no `window`) and hydrated in jsdom.
 * Svelte repairs a mismatch silently (an `{#if}`, a text node or an attribute that differs is
 * rewritten, not reported), so "no warning" proves nothing. These cases instead load the server's
 * exact HTML, hydrate it, and require the DOM right after `hydrate()` returns, before any effect
 * has run, to equal the server's. The control case shows the check does see a difference.
 */
const mounted: { app: ReturnType<typeof hydrate>; unmount: (app: never) => unknown }[] = [];
const tick = async () => (await import("svelte")).tick();

useServerRenderer();

// The worker compiles the client fixture on its first import, which used to land inside the first
// test's timeout. `vi.resetModules` keeps Vite's compiled modules, so the later tests skip it.
beforeAll(load, 60_000);

beforeEach(() => {
  vi.resetModules();
});

afterEach(async () => {
  for (const { app, unmount } of mounted.splice(0)) await unmount(app as never);
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.getElementById("cookieyes-portal-root")?.remove();
  document.body.innerHTML = "";
  Reflect.deleteProperty(navigator, "globalPrivacyControl");
  vi.restoreAllMocks();
});

const STORED = [
  "consentid:abc",
  "consent:yes",
  "action:yes",
  "necessary:yes",
  "functional:yes",
  "analytics:yes",
  "performance:yes",
  "advertisement:yes",
  "lastRenewedDate:1700000000000",
];

/** The raw `Cookie` header a returning visitor's request carries. */
const acceptedHeader = () => `cookieyes-consent=${encodeURIComponent(STORED.join(","))}`;

const read = (extra: Partial<CookieYesRequestState> = {}): CookieYesRequestState => ({
  read: true,
  initialConsent: null,
  region: undefined,
  forcedRegion: undefined,
  ...extra,
});

/**
 * A fresh module graph, so each test gets its own runtime and its own claim on the page. Svelte
 * itself is loaded again with it, and has to be the copy the component runs on, so `hydrate` and
 * `mount` come from here and not from a static import.
 */
async function load() {
  const page = await import("./fixtures/RootPage.svelte");
  const svelte = await import("@cookieyes/svelte");
  const runtime = await import("svelte");
  return {
    Page: page.default,
    getCookieYes: svelte.getCookieYes,
    mount: runtime.mount,
    hydrate: runtime.hydrate,
    unmount: runtime.unmount,
  };
}

/** Renders on the server, hydrates the result, and reports the DOM at each step. */
async function serverThenClient(server: PageSpec, client: PageSpec = server) {
  const { body } = await renderOnServer(server);
  const { Page, getCookieYes, hydrate, unmount } = await load();
  const container = document.createElement("div");
  container.innerHTML = body;
  document.body.append(container);
  const atLoad = container.innerHTML;
  mounted.push({ app: hydrate(Page, { target: container, props: { spec: client } }), unmount });
  // Before any effect has run: this is the DOM hydration itself produced.
  const afterHydrate = container.innerHTML;
  for (let i = 0; i < 4; i++) await tick();
  return { html: body, container, atLoad, afterHydrate, getCookieYes };
}

describe("<CookieYesRoot>: first-time visitor", () => {
  it("hydrates the server banner into the same DOM", async () => {
    const spec: PageSpec = { regulation: "GDPR", state: read() };
    const { html, atLoad, afterHydrate } = await serverThenClient(spec);
    expect(html).toContain('data-cy-part="banner"');
    expect(html).toContain("Accept All");
    expect(html).not.toContain('data-cy-part="recall"');
    expect(afterHydrate).toBe(atLoad);
    expect(
      document.getElementById("cookieyes-portal-root")?.querySelector(".cy-banner-wrap"),
    ).not.toBeNull();
  });
});

describe("<CookieYesRoot>: returning visitor", () => {
  it("sends no banner, the recall button instead, and hydrates into the same DOM", async () => {
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "GDPR" });
    expect(initialConsent).not.toBeNull();
    const spec: PageSpec = { regulation: "GDPR", state: read({ initialConsent }) };
    document.cookie = acceptedHeader();
    const { html, atLoad, afterHydrate } = await serverThenClient(spec);
    expect(html).not.toContain('data-cy-part="banner"');
    expect(html).toContain('data-cy-part="recall"');
    expect(afterHydrate).toBe(atLoad);
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    expect(document.querySelector('[data-cy-part="recall"]')).not.toBeNull();
  });
});

describe("<CookieYesRoot>: CCPA visitor", () => {
  const spec: PageSpec = { state: read({ region: "US-CA" }) };

  it("uses the region the server read: the CCPA banner, hydrated into the same DOM", async () => {
    const { html, atLoad, afterHydrate, getCookieYes } = await serverThenClient(spec);
    expect(html).toContain("Do Not Sell");
    expect(html).toContain("cy-banner-footer--ccpa");
    expect(afterHydrate).toBe(atLoad);
    expect(getCookieYes().getServerSnapshot().regulation).toBe("CCPA");
    // The browser's runtime runs under the regulation the banner shows.
    expect(getCookieYes().getSnapshot().regulation).toBe("CCPA");
  });

  it("opens the opt-out dialog the Do Not Sell button leads to", async () => {
    const { getCookieYes } = await serverThenClient(spec);
    getCookieYes().showOptOut();
    for (let i = 0; i < 4; i++) await tick();
    expect(document.body.textContent).toContain("Opt-out Preferences");
  });

  it("gives a visitor outside California the GDPR banner, ignoring the configured detector", async () => {
    const { html, atLoad, afterHydrate } = await serverThenClient({
      state: read({ region: "DE" }),
    });
    expect(html).not.toContain("Do Not Sell");
    expect(html).toContain("Accept All");
    expect(afterHydrate).toBe(atLoad);
  });

  it("ignores a configured detector when the server read the request but found no region", async () => {
    const { html } = await serverThenClient({ state: read() });
    expect(html).not.toContain("Do Not Sell");
  });
});

describe("<CookieYesRoot>: a regulation CCPA can never apply to", () => {
  it("mounts no opt-out dialog, so the Do Not Sell flow does not exist", async () => {
    const { html, getCookieYes } = await serverThenClient({
      regulation: "GDPR",
      state: read(),
    });
    expect(html).not.toContain("Do Not Sell");
    getCookieYes().showOptOut();
    for (let i = 0; i < 4; i++) await tick();
    expect(document.body.textContent).not.toContain("Opt-out Preferences");
  });
});

describe("<CookieYesRoot>: GPC visitor", () => {
  it("renders the same HTML as any CCPA visitor and applies the opt-out only after mount", async () => {
    const spec: PageSpec = { state: read({ region: "US-CA" }) };
    const plain = await renderOnServer(spec);
    // The server reads Sec-GPC into locals but never into the page, so nothing differs.
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    const { html, atLoad, afterHydrate, getCookieYes } = await serverThenClient(spec);
    expect(html).toBe(plain.body);
    expect(afterHydrate).toBe(atLoad);
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(false);
    expect(getCookieYes().getServerSnapshot().committedCategories.analytics).toBe(true);
  });
});

describe("<CookieYesRoot>: a page the server did not personalise", () => {
  // A prerendered page: the same HTML for everyone, so both sides render the strictest rules and
  // the configured detector, which may read browser-only signals, takes over once mounted.
  const neutral: PageSpec = { state: { ...read(), read: false } };

  it("renders the strictest regulation on the server and while hydrating", async () => {
    const { html, atLoad, afterHydrate } = await serverThenClient(neutral);
    expect(html).toContain("Accept All");
    expect(html).not.toContain("Do Not Sell");
    expect(afterHydrate).toBe(atLoad);
  });

  it("lets the configured detector decide once mounted", async () => {
    await serverThenClient(neutral);
    expect(document.body.textContent).toContain("Do Not Sell");
  });

  it("treats a page with no state at all the same way", async () => {
    const { html, atLoad, afterHydrate } = await serverThenClient({});
    expect(html).not.toContain("Do Not Sell");
    expect(afterHydrate).toBe(atLoad);
  });
});

describe("<CookieYesRoot>: client-only mount", () => {
  it("reads live state at once, so a returning visitor never sees a banner appear and vanish", async () => {
    const { Page, mount, unmount } = await load();
    document.cookie = acceptedHeader();
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "GDPR" });
    const target = document.createElement("div");
    document.body.append(target);
    mounted.push({
      app: mount(Page, {
        target,
        props: { spec: { regulation: "GDPR", state: read({ initialConsent }) } },
      }),
      unmount,
    });
    await tick();
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    expect(document.querySelector('[data-cy-part="recall"]')).not.toBeNull();
  });

  it("applies the configured detector at once for a page with no state", async () => {
    const { Page, mount, unmount } = await load();
    const target = document.createElement("div");
    document.body.append(target);
    mounted.push({ app: mount(Page, { target, props: { spec: {} } }), unmount });
    await tick();
    expect(document.body.textContent).toContain("Do Not Sell");
  });
});

describe("<CookieYesRoot>: children and ui", () => {
  it("renders the page content inside the provider after the stock UI", async () => {
    const { body: html } = await renderOnServer({
      regulation: "GDPR",
      state: read(),
      content: true,
    });
    expect(html).toContain('id="page"');
    expect(html.indexOf('data-cy-part="banner"')).toBeLessThan(html.indexOf('id="page"'));
  });

  it("replaces the stock UI with the ui snippet, and still renders the children", async () => {
    const { body: html } = await renderOnServer({
      regulation: "GDPR",
      state: read(),
      content: true,
      customUi: true,
    });
    expect(html).toContain('id="custom"');
    expect(html).toContain('id="page"');
    expect(html).not.toContain('data-cy-part="banner"');
  });
});

describe("<CookieYesRoot>: without a config", () => {
  it("explains what it needs", async () => {
    const { default: Root } = await import("../CookieYesRoot.svelte");
    const { mount } = await import("svelte");
    const target = document.createElement("div");
    expect(() => mount(Root, { target, props: {} as never })).toThrow("needs a `config` prop");
  });
});

describe("the hydration check", () => {
  it("sees a difference when the client renders another regulation than the server did", async () => {
    // Svelte repairs this without a word, so only the comparison can tell.
    const { atLoad, afterHydrate } = await serverThenClient(
      { regulation: "GDPR", state: read() },
      { regulation: "CCPA", state: read() },
    );
    expect(afterHydrate).not.toBe(atLoad);
  });
});
