import { CookieYes, type CookieYesConfig, resetCookieYes } from "@cookieyes/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { _CONFIG_KEY } from "../runtime/config.js";
import { fake, resetFake } from "./stubs/nuxt-app.js";

vi.mock("nuxt/app", () => import("./stubs/nuxt-app.js"));

const { default: CookieYesRoot, _canBeCcpa } = await import(
  "../runtime/components/CookieYesRoot.js"
);

const DECIDED =
  "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,functional:no," +
  "analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";

async function render(
  config: CookieYesConfig,
  request: Record<string, unknown> = {},
  slot?: () => unknown,
): Promise<string> {
  fake.states.clear();
  const { useState } = await import("./stubs/nuxt-app.js");
  const state = useState<Record<string, unknown>>("cookieyes:request", () => ({
    read: false,
    initialConsent: null,
    region: undefined,
    forcedRegion: undefined,
  }));
  state.value = { ...state.value, ...request };
  const app = createSSRApp({
    render: () => h(CookieYesRoot, null, slot ? { default: slot } : undefined),
  });
  app.use(CookieYes, config);
  app.provide(_CONFIG_KEY, config);
  return renderToString(app);
}

beforeEach(resetFake);
afterEach(() => resetCookieYes());

describe("<CookieYesRoot />", () => {
  it("renders the banner for a first-time visitor", async () => {
    expect(await render({ mode: "cookie-only", regulation: "GDPR" })).toContain(
      'data-cy-part="banner"',
    );
  });

  it("leaves the banner out for a returning visitor the server recognised", async () => {
    const { readServerConsent } = await import("@cookieyes/vue");
    const initialConsent = readServerConsent(`cookieyes-consent=${DECIDED}`, {
      regulation: "GDPR",
    });
    const html = await render(
      { mode: "cookie-only", regulation: "GDPR" },
      { read: true, initialConsent },
    );
    expect(html).not.toContain('data-cy-part="banner"');
    expect(html).toContain("Consent Preferences");
  });

  it("uses the region the server read, so a California visitor gets the CCPA banner", async () => {
    const config: CookieYesConfig = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } };
    expect(await render(config, { read: true, region: "US-CA" })).toContain("Do Not Sell");
    expect(await render(config, { read: true, region: "DE" })).not.toContain("Do Not Sell");
  });

  it("ignores a configured detector when the server read the request: headers only", async () => {
    const config: CookieYesConfig = {
      mode: "cookie-only",
      region: { map: { "US-CA": "CCPA" }, detect: () => "US-CA" },
    };
    expect(await render(config, { read: true })).not.toContain("Do Not Sell");
  });

  it("renders the strictest regulation while hydrating a page the server did not personalise", async () => {
    fake.isHydrating = true;
    const config: CookieYesConfig = {
      mode: "cookie-only",
      region: { map: { "US-CA": "CCPA" }, detect: () => "US-CA" },
    };
    expect(await render(config)).not.toContain("Do Not Sell");
  });

  it("uses the configured detector on a client-only render", async () => {
    const config: CookieYesConfig = {
      mode: "cookie-only",
      region: { map: { "US-CA": "CCPA" }, detect: () => "US-CA" },
    };
    expect(await render(config)).toContain("Do Not Sell");
  });

  it("includes the opt-out dialog only when a CCPA regulation can apply", () => {
    expect(_canBeCcpa({ mode: "cookie-only", regulation: "CCPA" })).toBe(true);
    expect(_canBeCcpa({ mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } })).toBe(true);
    expect(_canBeCcpa({ mode: "cookie-only", region: { strictest: "CCPA" } })).toBe(true);
    expect(_canBeCcpa({ mode: "cookie-only", regulation: "GDPR" })).toBe(false);
    expect(_canBeCcpa({ mode: "cookie-only", region: { map: { DE: "GDPR" } } })).toBe(false);
  });

  it("renders a default slot instead of the presets", async () => {
    const html = await render({ mode: "cookie-only", regulation: "GDPR" }, {}, () =>
      h("p", { id: "custom" }, "Mine"),
    );
    expect(html).toContain('id="custom"');
    expect(html).not.toContain('data-cy-part="banner"');
  });

  it("explains the missing module when used without it", async () => {
    const app = createSSRApp({ render: () => h(CookieYesRoot) });
    app.config.warnHandler = () => {};
    await expect(renderToString(app)).rejects.toThrow("@cookieyes/nuxt module");
  });
});
