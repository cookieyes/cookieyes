import type { CookieYesConfig } from "@cookieyes/core";
import { hydrate, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _createRuntime, _tryGetCookieYes, getCookieYes } from "../runtime.js";
import ConsentProbe from "./fixtures/ConsentProbe.svelte";
import RegionProbe from "./fixtures/RegionProbe.svelte";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";
import {
  clearCookie,
  cookieOnly,
  mountWith,
  settle,
  spyConsole,
  unmountAll,
} from "./test-utils.js";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

useServerRenderer();
beforeEach(clearCookie);
afterEach(() => {
  unmountAll();
  vi.unstubAllEnvs();
  document.cookie = "__cyd_region=; max-age=0; path=/";
});

type Out = { region?: unknown; regulation?: unknown };

function probe(
  provider: Parameters<typeof mountWith>[3],
  config: CookieYesConfig = { mode: "cookie-only" },
  out: Out = {},
) {
  const rendered = mountWith(config, RegionProbe, { out }, provider);
  return { out, ...rendered };
}

describe("CookieYesProvider", () => {
  it("resolves the regulation from region", () => {
    const { out } = probe({ region: { detect: () => "US-CA", map } });
    expect(out.regulation).toBe("CCPA");
    expect(out.region).toMatchObject({ region: "US-CA", regulation: "CCPA", source: "detected" });
  });

  it("takes the regulation from the config when the prop is not given", () => {
    const { out } = probe({}, cookieOnly("CCPA"));
    expect(out.region).toMatchObject({ regulation: "CCPA", source: "manual" });
  });

  it("takes the region from the config when the prop is not given", () => {
    const { out } = probe({}, { mode: "cookie-only", region: { detect: () => "DE", map } });
    expect(out.region).toMatchObject({ region: "DE", regulation: "GDPR" });
  });

  it("lets a manual regulation win over region", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { out } = probe({ region: { detect: () => "US-CA", map }, regulation: "GDPR" });
    expect(out.regulation).toBe("GDPR");
  });

  it("supplies a fixed regulation directly", () => {
    const { out } = probe({ regulation: "CCPA" });
    expect(out.regulation).toBe("CCPA");
  });

  it("falls back to the strictest for an unknown region", () => {
    const { out } = probe({ region: { detect: () => "JP", map } });
    expect(out.region).toMatchObject({
      regulation: "GDPR",
      source: "strictest",
      confidence: "low",
    });
  });

  it("starts the runtime from the config and registers it for getCookieYes()", () => {
    probe({}, cookieOnly("GDPR"));
    expect(getCookieYes().config).toMatchObject({ mode: "cookie-only", regulation: "GDPR" });
  });

  it("reuses the running runtime when the config is the same object", () => {
    const config = cookieOnly("GDPR");
    probe({}, config);
    const first = getCookieYes();
    const warnings = spyConsole();
    probe({}, config);
    expect(getCookieYes()).toBe(first);
    expect(warnings.messages()).toEqual([]);
  });

  it("warns in a browser when a different config replaces the running one", () => {
    probe({}, cookieOnly("GDPR"));
    const first = getCookieYes();
    const warnings = spyConsole();
    probe({}, cookieOnly("GDPR"));
    expect(getCookieYes()).not.toBe(first);
    expect(warnings.messages().join("\n")).toContain("ran again with a different config");
  });

  it("follows a regulation prop change", async () => {
    const out: Out = {};
    const view = mountWith(cookieOnly("DEFAULT"), RegionProbe, { out }, { regulation: "GDPR" });
    expect(view.container.textContent).toBe("GDPR");
    await view.rerender({ regulation: "CCPA" });
    await settle();
    expect(view.container.textContent).toBe("CCPA");
  });

  it("does not share one provider's regulation with another provider's tree", () => {
    const a = {} as Out;
    const b = {} as Out;
    const config = cookieOnly("DEFAULT");
    mountWith(config, RegionProbe, { out: a }, { regulation: "GDPR" });
    mountWith(config, RegionProbe, { out: b }, { regulation: "CCPA" });
    expect(a.regulation).toBe("GDPR");
    expect(b.regulation).toBe("CCPA");
  });

  it("supplies initialConsent to the hooks on the server", async () => {
    const stored = {
      consentId: "abc",
      hasActed: true,
      categories: { necessary: true, analytics: true },
      regulation: "GDPR" as const,
    };
    const { body } = await renderOnServer({ parts: ["state"], initialConsent: stored });
    expect(body).toContain('"hasActed":true');
    expect(body).toContain('"analytics":true');
  });

  it("supplies initialConsent to a hook until the provider is live", () => {
    const stored = {
      consentId: "abc",
      hasActed: true,
      categories: { necessary: true, analytics: true },
      regulation: "GDPR" as const,
    };
    const view = mountWith(cookieOnly("GDPR"), ConsentProbe, {}, { initialConsent: stored });
    // A plain client mount is live at once, so the runtime's own (empty) decision shows.
    expect(view.container.textContent).toBe("false:false");
  });

  it("renders its children", () => {
    const view = mountWith(cookieOnly("GDPR"), RegionProbe, { out: {} });
    expect(view.container.querySelector("span")?.textContent).toBe("GDPR");
  });

  describe("forcedRegion prop", () => {
    it("overrides region detection in development, tagging the decision forced", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { out } = probe({ region: { detect: () => "DE", map }, forcedRegion: "US-CA" });
      expect(out.region).toMatchObject({ region: "US-CA", regulation: "CCPA", source: "forced" });
    });

    it("is ignored in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { out } = probe({ region: { detect: () => "DE", map }, forcedRegion: "US-CA" });
      expect(out.region).toMatchObject({ region: "DE", regulation: "GDPR", source: "detected" });
    });

    it("falls back to the browser's override cookie", () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=US-CA";
      const { out } = probe({ region: { detect: () => "DE", map } });
      expect(out.region).toMatchObject({ source: "forced", region: "US-CA" });
    });

    it("ignores a malformed override cookie instead of throwing", () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=%E0%A4%A";
      const { out } = probe({ region: { detect: () => "DE", map } });
      expect(out.region).toMatchObject({ region: "DE", source: "detected" });
    });

    it("hydrates the server's decision first, then switches to the cookie", async () => {
      vi.stubEnv("NODE_ENV", "development");
      document.cookie = "__cyd_region=US-CA";
      // The server never sees the browser cookie, so it renders the real decision.
      const { body } = await renderOnServer({ parts: ["state"], region: "DE" });
      expect(body).toContain('"regulation":"GDPR"');
      const { default: Page } = await import("./fixtures/SsrPage.svelte");
      const target = document.createElement("div");
      target.innerHTML = body;
      document.body.append(target);
      const before = target.innerHTML;
      const component = hydrate(Page, {
        target,
        props: { spec: { parts: ["state"], region: "DE" } },
      });
      expect(target.innerHTML).toBe(before);
      await tick();
      await tick();
      expect(target.textContent).toContain('"regulation":"CCPA"');
      void component;
    });
  });

  describe("devtools instrumentation", () => {
    type Entry = { k: string; d: unknown };
    type G = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: Entry[] };
    afterEach(() => {
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
    });

    it("reports the regulation it resolved, which can differ from the runtime's", () => {
      vi.stubEnv("NODE_ENV", "development");
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
      probe({ regulation: "CCPA" });
      const pushed = ((globalThis as G).__COOKIEYES_DEVTOOLS__ ?? []).filter((e) => e.k === "p");
      expect(pushed[pushed.length - 1]?.d).toMatchObject({ regulation: "CCPA", source: "manual" });
    });

    it("reports nothing in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete (globalThis as G).__COOKIEYES_DEVTOOLS__;
      probe({ regulation: "CCPA" });
      const pushed = ((globalThis as G).__COOKIEYES_DEVTOOLS__ ?? []).filter((e) => e.k === "p");
      expect(pushed).toEqual([]);
    });
  });
});

describe("_tryGetCookieYes", () => {
  it("is null before a runtime exists and the runtime after", () => {
    expect(_tryGetCookieYes()).toBeNull();
    const rt = _createRuntime(cookieOnly());
    expect(_tryGetCookieYes()).toBe(rt);
  });
});
