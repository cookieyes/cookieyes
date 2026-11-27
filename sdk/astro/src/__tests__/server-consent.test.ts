import { describe, expect, it, vi } from "vitest";
import {
  _canBeCcpa,
  _defaultLocals,
  _readRequestConsent,
  _sharedRegulation,
} from "../server-consent.js";

// A stored decision under the default five categories (taxonomy hash 2fbx48).
const DECIDED =
  "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,functional:no," +
  "analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";
const REGIONAL = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } } as const;

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("_readRequestConsent", () => {
  it("reads nothing personal from a first-time visitor and gives required categories only", () => {
    const locals = _readRequestConsent(headers({}), REGIONAL, false);
    expect(locals).toMatchObject({
      read: true,
      initialConsent: null,
      region: undefined,
      regulation: "GDPR",
      gpc: false,
    });
    expect(locals.categories).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("returns a returning visitor's stored decision and categories", () => {
    const locals = _readRequestConsent(
      headers({ cookie: `cookieyes-consent=${encodeURIComponent(DECIDED)}` }),
      REGIONAL,
      false,
    );
    expect(locals.initialConsent?.hasActed).toBe(true);
    expect(locals.categories.analytics).toBe(true);
  });

  it("places a visitor by the Vercel and Cloudflare geo headers", () => {
    const vercel = _readRequestConsent(
      headers({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" }),
      REGIONAL,
      false,
    );
    expect(vercel).toMatchObject({ region: "US-CA", regulation: "CCPA" });
    const cloudflare = _readRequestConsent(headers({ "cf-ipcountry": "DE" }), REGIONAL, false);
    expect(cloudflare).toMatchObject({ region: "DE", regulation: "GDPR" });
  });

  it("gives an undecided CCPA visitor required categories only", () => {
    const locals = _readRequestConsent(
      headers({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" }),
      REGIONAL,
      false,
    );
    expect(locals.categories.analytics).toBe(false);
  });

  it("reports Sec-GPC", () => {
    expect(_readRequestConsent(headers({ "sec-gpc": "1" }), REGIONAL, false).gpc).toBe(true);
  });

  it("honours the DevTools region cookie in development only", () => {
    const cookie = { cookie: "__cyd_region=US-CA" };
    expect(_readRequestConsent(headers(cookie), REGIONAL, true)).toMatchObject({
      forcedRegion: "US-CA",
      regulation: "CCPA",
    });
    expect(_readRequestConsent(headers(cookie), REGIONAL, false)).toMatchObject({
      forcedRegion: undefined,
      regulation: "GDPR",
    });
    expect(
      _readRequestConsent(headers({ cookie: "__cyd_region=%E0" }), REGIONAL, true).forcedRegion,
    ).toBeUndefined();
  });

  it("lets a manual regulation win without asking the region", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const locals = _readRequestConsent(
      headers({ "cf-ipcountry": "DE" }),
      { mode: "cookie-only", regulation: "CCPA", region: { detect: () => "DE" } },
      false,
    );
    expect(locals.regulation).toBe("CCPA");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("uses DEFAULT when neither a regulation nor a region is configured, as the runtime does", () => {
    expect(_readRequestConsent(headers({}), { mode: "cookie-only" }, false).regulation).toBe(
      "DEFAULT",
    );
  });
});

describe("_defaultLocals", () => {
  it("never reads build-time headers and gives the strictest regulation", () => {
    const locals = _defaultLocals({
      mode: "cookie-only",
      region: { map: { DE: "GDPR" }, strictest: "CCPA" },
    });
    expect(locals).toMatchObject({
      read: false,
      initialConsent: null,
      region: undefined,
      regulation: "CCPA",
      gpc: false,
      forcedRegion: undefined,
    });
    expect(locals.categories.necessary).toBe(true);
    expect(locals.categories.analytics).toBe(false);
  });
});

describe("_sharedRegulation", () => {
  it("is the manual regulation, then the strictest of an unknown region, then DEFAULT", () => {
    expect(_sharedRegulation({ mode: "cookie-only", regulation: "CCPA" })).toBe("CCPA");
    expect(_sharedRegulation({ mode: "cookie-only", overrides: { regulation: "GDPR" } })).toBe(
      "GDPR",
    );
    expect(_sharedRegulation({ mode: "cookie-only", region: { map: {} } })).toBe("GDPR");
    expect(_sharedRegulation({ mode: "cookie-only" })).toBe("DEFAULT");
  });
});

describe("_canBeCcpa", () => {
  it("is true when any configured route leads to CCPA", () => {
    expect(_canBeCcpa({ mode: "cookie-only", regulation: "CCPA" })).toBe(true);
    expect(_canBeCcpa({ mode: "cookie-only", region: { strictest: "CCPA" } })).toBe(true);
    expect(_canBeCcpa(REGIONAL)).toBe(true);
    expect(_canBeCcpa({ mode: "cookie-only", regulation: "GDPR" })).toBe(false);
  });
});
