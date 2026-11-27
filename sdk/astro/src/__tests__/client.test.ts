// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Client = typeof import("../client/index.js");

const CONFIG = { mode: "cookie-only", regulation: "GDPR" } as const;
const PAGE_DATA = {
  surfaces: ["banner", "preferences", "recall", "optOut"],
  classNames: {},
  request: { read: false },
};

function pageBlock(data: unknown = PAGE_DATA): string {
  return `<div id="cookieyes-portal-root"></div><script type="application/json" id="cookieyes-page">${JSON.stringify(data)}</script>`;
}

/** A fresh copy of the client module, as each page visit gets. */
async function load(): Promise<Client> {
  vi.resetModules();
  return import("../client/index.js");
}

async function opened(selector: string): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`${selector} not open yet`);
    return el;
  });
}

beforeEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = pageBlock();
});

afterEach(async () => {
  const { resetConsentRuntime } = await import("@cookieyes/core");
  resetConsentRuntime();
  vi.restoreAllMocks();
});

describe("_boot", () => {
  it("starts the banner once, with the surfaces and classes the page lists", async () => {
    document.body.innerHTML = pageBlock({
      surfaces: ["banner"],
      classNames: { banner: { acceptAll: "site-accept" } },
      request: { read: false },
    });
    const client = await load();
    client._boot(CONFIG, {});
    client._boot(CONFIG, {});
    expect(document.querySelectorAll("[data-cky-banner]")).toHaveLength(1);
    expect(document.querySelector('[data-cy-part="accept-all"]')?.classList).toContain(
      "site-accept",
    );
    const runtime = await client.getCookieYes();
    runtime.consentManager.rejectAll();
    // The recall button is not among the page's surfaces.
    expect(document.querySelector('[data-cy-part="recall"]')).toBeNull();
  });

  it("merges the client file over the JSON config", async () => {
    const onConsentUpdate = vi.fn();
    const client = await load();
    client._boot(CONFIG, { onConsentUpdate });
    (await client.getConsentActions()).acceptAll();
    await vi.waitFor(() => expect(onConsentUpdate).toHaveBeenCalled());
  });

  it("runs under the region the server read", async () => {
    document.body.innerHTML = pageBlock({ ...PAGE_DATA, request: { read: true, region: "US-CA" } });
    const client = await load();
    client._boot({ mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } }, {});
    expect((await client.getConsent()).regulation).toBe("CCPA");
  });

  it("starts nothing without <CookieYesRoot />, and names a component left outside it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    document.body.innerHTML = '<template data-cy-surface="CookieBanner"></template>';
    const client = await load();
    client._boot(CONFIG, {});
    expect(document.querySelector("[data-cky-banner]")).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[cookieyes] <CookieBanner /> needs <CookieYesRoot /> in your layout.",
    );
    // A later page with a root, reached through the client router, starts it.
    document.body.innerHTML = pageBlock();
    document.dispatchEvent(new Event("astro:page-load"));
    expect(document.querySelector("[data-cky-banner]")).not.toBeNull();
  });

  it("warns in development when the client file changes the categories", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = await load();
    client._boot(CONFIG, { categories: [{ id: "essential", required: true, label: "E" }] });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`categories` differ"));
  });
});

describe("the client functions", () => {
  it("wait for the runtime when called before it starts", async () => {
    const client = await load();
    const consent = client.getConsent();
    client.getConsentActions("banner").acceptAll();
    client._boot(CONFIG, {});
    expect((await consent).regulation).toBe("GDPR");
    expect(await client.getConsentCategory("analytics")).toBe(true);
    expect((await client.getConsent()).hasActed).toBe(true);
  });

  it("subscribe before the start, and unsubscribe before it too", async () => {
    const client = await load();
    const heard = vi.fn();
    const dropped = vi.fn();
    client.onConsentChange("change", heard, { category: "analytics" });
    client.onConsentChange("change", dropped)();
    client._boot(CONFIG, {});
    await client.getCookieYes();
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ isInitial: true }));
    client.getConsentActions().acceptAll();
    expect(heard).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isInitial: false,
        categories: expect.objectContaining({ analytics: true }),
      }),
    );
    expect(dropped).not.toHaveBeenCalled();
  });

  it("forward every action to the runtime", async () => {
    const client = await load();
    client._boot(CONFIG, {});
    const runtime = await client.getCookieYes();
    const manager = runtime.consentManager;
    const actions = client.getConsentActions("preferences");
    const spies = {
      acceptSelected: vi.spyOn(manager, "acceptSelected"),
      updateCategory: vi.spyOn(manager, "updateCategory"),
      savePreferences: vi.spyOn(manager, "savePreferences"),
      resetConsent: vi.spyOn(manager, "resetConsent"),
      hidePreferences: vi.spyOn(manager, "hidePreferences"),
      dismissBanner: vi.spyOn(manager, "dismissBanner"),
      rejectAll: vi.spyOn(manager, "rejectAll"),
    };
    actions.acceptSelected(["analytics"]);
    actions.updateCategory("analytics", false);
    actions.save();
    actions.reset();
    actions.hidePreferences();
    actions.dismissBanner();
    actions.rejectAll();
    expect(spies.acceptSelected).toHaveBeenCalledWith(["analytics"], "preferences");
    expect(spies.updateCategory).toHaveBeenCalledWith("analytics", false);
    expect(spies.savePreferences).toHaveBeenCalledWith("preferences");
    expect(spies.resetConsent).toHaveBeenCalled();
    expect(spies.hidePreferences).toHaveBeenCalled();
    expect(spies.dismissBanner).toHaveBeenCalled();
    expect(spies.rejectAll).toHaveBeenCalledWith("preferences");
  });

  it("open the dialogs, also when asked before the start", async () => {
    const client = await load();
    client.openOptOut();
    client._boot(CONFIG, {});
    await opened('[data-cy-part="optout"]');
    client.getConsentActions().hideOptOut();
    await vi.waitFor(() => expect(document.querySelector('[data-cy-part="optout"]')).toBeNull());
    client.getConsentActions().showPreferences();
    await opened('[data-cy-part="overlay"]');
    client.openPreferences();
    client.getConsentActions().showOptOut();
    expect(document.querySelectorAll('[data-cy-part="overlay"]').length).toBeGreaterThan(0);
  });

  it("opens the opt-out dialog when CCPA is configured only in the client file", async () => {
    // The server saw no CCPA, so the page lists no opt-out dialog.
    document.body.innerHTML = pageBlock({ ...PAGE_DATA, surfaces: ["banner", "recall"] });
    const client = await load();
    client._boot({ mode: "cookie-only" }, { regulation: "CCPA" });
    (document.querySelector('[data-cy-part="do-not-sell"]') as HTMLElement).click();
    await opened('[data-cy-part="optout"]');
    client.getConsentActions().hideOptOut();
    await vi.waitFor(() => expect(document.querySelector('[data-cy-part="optout"]')).toBeNull());
    client.openOptOut();
    await opened('[data-cy-part="optout"]');
  });

  it("says once in development when preferences open on a page that does not draw them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    document.body.innerHTML = pageBlock({ ...PAGE_DATA, surfaces: ["banner", "recall"] });
    const client = await load();
    client._boot(CONFIG, {});
    (document.querySelector('[data-cy-part="customise"]') as HTMLElement).click();
    const runtime = await client.getCookieYes();
    runtime.consentManager.hidePreferences();
    client.openPreferences();
    const messages = warn.mock.calls.filter(([m]) => String(m).includes("<CookiePreferences />"));
    expect(messages).toHaveLength(1);
  });

  it("stays quiet when the page draws the preferences dialog", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = await load();
    client._boot(CONFIG, {});
    client.openPreferences();
    await opened('[data-cy-part="overlay"]');
    expect(warn).not.toHaveBeenCalled();
  });
});
