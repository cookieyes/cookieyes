import type { CookieYesConfig } from "@cookieyes/vue";
import { describe, expect, it, vi } from "vitest";
import {
  _emptyRequestConsent,
  _isSharedRender,
  _readRequestConsent,
  _withRequestRegion,
} from "../runtime/server-consent.js";

const config = (extra: Partial<CookieYesConfig> = {}): CookieYesConfig =>
  ({ mode: "cookie-only", ...extra }) as CookieYesConfig;

// A stored decision under the default five categories (taxonomy hash 2fbx48).
const DECIDED =
  "cookieyes-consent=consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes," +
  "functional:no,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";

describe("_readRequestConsent", () => {
  it("returns no stored consent for a first-time visitor, and records that it read the request", () => {
    expect(_readRequestConsent({}, config())).toEqual({ ..._emptyRequestConsent(), read: true });
  });

  it("returns a returning visitor's stored decision", () => {
    const { initialConsent } = _readRequestConsent(
      { cookie: DECIDED },
      config({ regulation: "GDPR" }),
    );
    expect(initialConsent?.hasActed).toBe(true);
    expect(initialConsent?.categories.analytics).toBe(true);
    expect(initialConsent?.categories.advertisement).toBe(false);
  });

  it("reads the Vercel geo headers as country and region", () => {
    const headers = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" };
    expect(_readRequestConsent(headers, config()).region).toBe("US-CA");
  });

  it("reads Cloudflare's country header", () => {
    expect(_readRequestConsent({ "cf-ipcountry": "DE" }, config()).region).toBe("DE");
  });

  it("reads no other geo header, matching @cookieyes/nextjs", () => {
    expect(
      _readRequestConsent({ "cloudfront-viewer-country": "DE" }, config()).region,
    ).toBeUndefined();
  });

  it("reads the stored decision under the regulation the region resolves to", () => {
    const headers = {
      cookie: DECIDED,
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    };
    const result = _readRequestConsent(headers, config({ region: { map: { "US-CA": "CCPA" } } }));
    expect(result.initialConsent?.regulation).toBe("CCPA");
  });

  it("lets a manual regulation win without the both-set warning on every request", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const headers = { cookie: DECIDED, "cf-ipcountry": "US" };
    const result = _readRequestConsent(
      headers,
      config({ regulation: "GDPR", region: { map: { US: "CCPA" } } }),
    );
    expect(result.initialConsent?.regulation).toBe("GDPR");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reads the DevTools region cookie outside production", () => {
    const result = _readRequestConsent({ cookie: "__cyd_region=US-CA" }, config());
    expect(result.forcedRegion).toBe("US-CA");
  });

  it("ignores a malformed DevTools region cookie", () => {
    expect(
      _readRequestConsent({ cookie: "__cyd_region=%E0%A4%A" }, config()).forcedRegion,
    ).toBeUndefined();
  });

  it("never reads the DevTools region cookie in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      _readRequestConsent({ cookie: "__cyd_region=US-CA" }, config()).forcedRegion,
    ).toBeUndefined();
    vi.unstubAllEnvs();
  });
});

describe("_isSharedRender", () => {
  it("is true for route rules that serve one HTML to every visitor", () => {
    expect(_isSharedRender({ swr: 60 })).toBe(true);
    expect(_isSharedRender({ isr: true })).toBe(true);
    expect(_isSharedRender({ cache: { maxAge: 60 } })).toBe(true);
    expect(_isSharedRender({ prerender: true })).toBe(true);
  });

  it("is false for a request-time route", () => {
    expect(_isSharedRender({})).toBe(false);
    expect(_isSharedRender({ swr: false, isr: false })).toBe(false);
    expect(_isSharedRender({ headers: { "x-a": "b" } })).toBe(false);
  });
});

describe("_withRequestRegion", () => {
  const map = { "US-CA": "CCPA" } as const;

  it("gives the browser runtime the region the server read, replacing a configured detector", () => {
    const request = { ..._emptyRequestConsent(), read: true, region: "US-CA" };
    const result = _withRequestRegion(config({ region: { map, detect: () => "DE" } }), request);
    expect(result.region?.detect?.()).toBe("US-CA");
    expect(result.region?.map).toEqual(map);
  });

  it("uses no region when the server read the request but found no geo header", () => {
    const request = { ..._emptyRequestConsent(), read: true };
    expect(
      _withRequestRegion(
        config({ region: { map, detect: () => "US-CA" } }),
        request,
      ).region?.detect?.(),
    ).toBeUndefined();
  });

  it("keeps the configured detector when the server read nothing", () => {
    const detect = () => "DE";
    const cfg = config({ region: { map, detect } });
    expect(_withRequestRegion(cfg, _emptyRequestConsent())).toBe(cfg);
  });

  it("leaves a config without region detection alone", () => {
    const cfg = config({ regulation: "GDPR" });
    expect(
      _withRequestRegion(cfg, { ..._emptyRequestConsent(), read: true, region: "US-CA" }),
    ).toBe(cfg);
  });
});
