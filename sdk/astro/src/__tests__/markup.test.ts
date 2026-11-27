import { type CookieYesConfig, defaultTranslations, resolveTranslations } from "@cookieyes/core";
import { banner, bannerAnnouncer, renderToString } from "@cookieyes/ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type _PageData,
  _renderGatedFrame,
  _renderGatedScript,
  _renderRoot,
  _renderSurface,
  _resetWarnings,
  _setPageConfig,
} from "../markup.js";
import { _defaultLocals, _readRequestConsent, type CookieYesLocals } from "../server-consent.js";

const CONFIG = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } } as const;
const DECIDED = "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,analytics:yes";

function page(config: CookieYesConfig, cookieyes: CookieYesLocals): { cookieyes: CookieYesLocals } {
  const locals = { cookieyes };
  _setPageConfig(locals, config);
  return locals;
}

function request(config: CookieYesConfig, headers: Record<string, string> = {}) {
  return page(config, _readRequestConsent(new Headers(headers), config, false));
}

/** The banner exactly as `@cookieyes/ui` renders it, marked as the shell vanilla adopts. */
function uiShell(regulation: "GDPR" | "CCPA" | "DEFAULT", wait: boolean, t = defaultTranslations) {
  const node = banner({ translations: t, regulation, titleId: "cy-shell-title" });
  return renderToString([
    { ...bannerAnnouncer(), attrs: { ...bannerAnnouncer().attrs, "data-cy-shell": "" } },
    {
      ...node,
      attrs: { ...node.attrs, "data-cy-shell": "", ...(wait ? { "data-cy-wait": "" } : {}) },
    },
  ]);
}

function data(html: string): _PageData {
  const json = /<script type="application\/json" id="cookieyes-page">(.*)<\/script>/.exec(
    html,
  )?.[1];
  return JSON.parse(json ?? "null") as _PageData;
}

afterEach(() => {
  vi.restoreAllMocks();
  _resetWarnings();
});

describe("_renderRoot", () => {
  it("draws @cookieyes/ui's banner for a first-time GDPR visitor, inside the persisted root", async () => {
    const html = await _renderRoot(request(CONFIG), undefined);
    expect(html).toContain(uiShell("GDPR", false));
    expect(html).toMatch(
      /^<div id="cookieyes-portal-root" data-astro-transition-persist="cookieyes">/,
    );
    expect(data(html)).toEqual({
      surfaces: ["banner", "preferences", "recall", "optOut"],
      classNames: {},
      request: { read: true },
    });
  });

  it("draws the CCPA banner for a visitor placed in California", async () => {
    const html = await _renderRoot(
      request(CONFIG, { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" }),
      undefined,
    );
    expect(html).toContain(uiShell("CCPA", false));
    expect(data(html).request).toEqual({ read: true, region: "US-CA" });
  });

  it("hands the browser the DevTools region only where the server honoured it, in development", async () => {
    const headers = new Headers({ cookie: "__cyd_region=US-CA", "cf-ipcountry": "DE" });
    const dev = page(CONFIG, _readRequestConsent(headers, CONFIG, true));
    expect(data(await _renderRoot(dev, undefined)).request).toEqual({
      read: true,
      region: "DE",
      forcedRegion: "US-CA",
    });
    const production = page(CONFIG, _readRequestConsent(headers, CONFIG, false));
    expect(data(await _renderRoot(production, undefined)).request).toEqual({
      read: true,
      region: "DE",
    });
  });

  it("draws no banner for a returning visitor", async () => {
    const html = await _renderRoot(
      request(CONFIG, { cookie: `cookieyes-consent=${DECIDED}` }),
      undefined,
    );
    expect(html).not.toContain('data-cy-part="banner"');
  });

  it("draws the same banner for a visitor sending GPC", async () => {
    const html = await _renderRoot(request(CONFIG, { "sec-gpc": "1" }), undefined);
    expect(html).toContain(uiShell("GDPR", false));
  });

  it("marks the banner of a shared page to wait for the head script", async () => {
    const html = await _renderRoot(page(CONFIG, _defaultLocals(CONFIG)), undefined);
    expect(html).toContain(uiShell("GDPR", true));
    expect(data(html).request).toEqual({ read: false });
  });

  it("uses the configured text and leaves the opt-out out when CCPA cannot apply", async () => {
    const config = {
      mode: "cookie-only",
      regulation: "GDPR",
      i18n: { messages: { en: { bannerTitle: "Cookies <here>" } } },
    } as const;
    const html = await _renderRoot(request(config), undefined);
    expect(html).toContain(uiShell("GDPR", false, resolveTranslations(config.i18n)));
    expect(html).toContain("Cookies &lt;here&gt;");
    expect(data(html).surfaces).toEqual(["banner", "preferences", "recall"]);
  });

  it("renders the default slot instead, with the surfaces and classes it records", async () => {
    const locals = request(CONFIG);
    const html = await _renderRoot(locals, async () =>
      [
        _renderSurface(locals, "banner", { class: "card", classNames: { acceptAll: "go" } }),
        _renderSurface(locals, "preferences", { classNames: { save: "keep" } }),
        _renderSurface(locals, "recall", { class: "r" }),
      ].join(""),
    );
    expect(html).toContain('class="cy-banner card"');
    expect(html).toContain('class="cy-btn cy-btn-primary go" data-cy-part="accept-all"');
    expect(data(html)).toEqual({
      surfaces: ["banner", "preferences", "recall"],
      classNames: {
        banner: { acceptAll: "go", root: "card" },
        preferences: { save: "keep" },
        recall: { root: "r" },
      },
      request: { read: true },
    });
  });

  it("writes no style attribute and no unescaped < in the page data", async () => {
    const locals = request(CONFIG);
    const html = await _renderRoot(locals, async () =>
      _renderSurface(locals, "banner", { classNames: { title: "</script><x>" } }),
    );
    expect(html).not.toContain("style=");
    expect(data(html).classNames.banner?.title).toBe("</script><x>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it("uses the first of two roots and says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const locals = request(CONFIG);
    expect(await _renderRoot(locals, undefined)).not.toBe("");
    expect(await _renderRoot(locals, undefined)).toBe("");
    expect(warn).toHaveBeenCalledWith(
      "[cookieyes] Two <CookieYesRoot /> on this page; the first is used.",
    );
  });
});

describe("_renderSurface", () => {
  it("draws only a marker for the surfaces the browser draws when they open", () => {
    const locals = request(CONFIG);
    expect(_renderSurface(locals, "preferences")).toBe(
      '<template data-cy-surface="CookiePreferences"></template>',
    );
    expect(_renderSurface(locals, "reloadNotice")).toBe(
      '<template data-cy-surface="ReloadNotice"></template>',
    );
  });
});

describe("without the integration", () => {
  it("renders nothing, throws nothing and logs once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const locals = {};
    expect(await _renderRoot(locals, undefined)).toBe("");
    expect(_renderSurface(locals, "banner")).toBe("");
    expect(_renderGatedScript(locals, { id: "a", src: "/a.js", category: "analytics" })).toBe("");
    expect(_renderGatedFrame(locals, { src: "/f", category: "analytics" }, undefined)).toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[cookieyes] Add cookieyes() to integrations in astro.config.mjs.",
    );
  });
});

describe("_renderGatedScript", () => {
  it("renders a template the browser registers with core", () => {
    expect(
      _renderGatedScript(request(CONFIG), {
        id: "ga",
        src: "/ga.js?a=1&b=2",
        category: "analytics",
      }),
    ).toBe(
      '<template data-cy-gated-script data-id="ga" data-src="/ga.js?a=1&amp;b=2" data-category="analytics"></template>',
    );
  });
});

describe("_renderGatedFrame", () => {
  it("renders the placeholder with the category's label, never the iframe", () => {
    const html = _renderGatedFrame(
      request(CONFIG),
      {
        src: "https://maps.example/x",
        category: "analytics",
        title: "Map",
        allowfullscreen: true,
        width: 600,
        hidden: false,
      },
      undefined,
    );
    expect(html).not.toContain("<iframe");
    expect(html).toContain("<strong>Analytics</strong>");
    expect(html).toContain("data-cy-gated-open");
    const frame = JSON.parse(
      (/data-frame="([^"]*)"/.exec(html)?.[1] ?? "").replace(/&quot;/g, '"'),
    ) as { src: string; attrs: Record<string, string> };
    expect(frame).toEqual({
      src: "https://maps.example/x",
      attrs: { title: "Map", allowfullscreen: "", width: "600" },
    });
  });

  it("puts the placeholder slot in place of the default text", () => {
    const html = _renderGatedFrame(
      request(CONFIG),
      { src: "/f", category: "analytics" },
      "<em>Mine</em>",
    );
    expect(html).toMatch(/data-cy-gated-frame[^>]*><em>Mine<\/em><\/div>$/);
  });
});
