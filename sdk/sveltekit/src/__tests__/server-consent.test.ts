// @vitest-environment node
import type { CookieYesConfig } from "@cookieyes/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _canBeCcpa,
  _emptyRequestState,
  _readRequestConsent,
  _withRequestRegion,
} from "../server-consent.js";
import { setDev } from "./stubs/app-environment.js";

const config = (extra: Partial<CookieYesConfig> = {}): CookieYesConfig =>
  ({ mode: "cookie-only", ...extra }) as CookieYesConfig;

const request = (headers: Record<string, string> = {}) => new Headers(headers);

// A stored decision under the default five categories (taxonomy hash 2fbx48).
const DECIDED =
  "cookieyes-consent=consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes," +
  "functional:no,analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";

describe("_readRequestConsent", () => {
  afterEach(() => setDev(true));

  it("returns no stored consent for a first-time visitor, and records that it read the request", () => {
    expect(_readRequestConsent(request(), config())).toEqual({
      ..._emptyRequestState(),
      read: true,
      gpc: false,
    });
  });

  it("returns a returning visitor's stored decision", () => {
    const { initialConsent } = _readRequestConsent(
      request({ cookie: DECIDED }),
      config({ regulation: "GDPR" }),
    );
    expect(initialConsent?.hasActed).toBe(true);
    expect(initialConsent?.categories.analytics).toBe(true);
    expect(initialConsent?.categories.advertisement).toBe(false);
  });

  it("reads the Vercel geo headers as country and region", () => {
    const headers = request({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" });
    expect(_readRequestConsent(headers, config()).region).toBe("US-CA");
  });

  it("reads Cloudflare's country header", () => {
    expect(_readRequestConsent(request({ "cf-ipcountry": "DE" }), config()).region).toBe("DE");
  });

  it.each([
    "cloudfront-viewer-country",
    "x-nf-geo",
    "x-country-code",
    "x-vercel-ip-country-override",
  ])("reads no other geo header: %s", (name) => {
    expect(_readRequestConsent(request({ [name]: "DE" }), config()).region).toBeUndefined();
  });

  it("reads the stored decision under the regulation the region resolves to", () => {
    const headers = request({
      cookie: DECIDED,
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    });
    const result = _readRequestConsent(headers, config({ region: { map: { "US-CA": "CCPA" } } }));
    expect(result.initialConsent?.regulation).toBe("CCPA");
  });

  it("returns null for a decision made under another taxonomy", () => {
    const headers = request({ cookie: DECIDED });
    const result = _readRequestConsent(
      headers,
      config({
        regulation: "GDPR",
        categories: [{ id: "necessary", required: true }, { id: "custom" }],
      }),
    );
    expect(result.initialConsent).toBeNull();
  });

  it("lets a manual regulation win without the both-set warning on every request", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const headers = request({ cookie: DECIDED, "cf-ipcountry": "US" });
    const result = _readRequestConsent(
      headers,
      config({ regulation: "GDPR", region: { map: { US: "CCPA" } } }),
    );
    expect(result.initialConsent?.regulation).toBe("GDPR");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("records Sec-GPC, and only the value 1", () => {
    expect(_readRequestConsent(request({ "sec-gpc": "1" }), config()).gpc).toBe(true);
    expect(_readRequestConsent(request({ "sec-gpc": "0" }), config()).gpc).toBe(false);
    expect(_readRequestConsent(request(), config()).gpc).toBe(false);
  });

  it("reads the DevTools region cookie outside production", () => {
    const result = _readRequestConsent(request({ cookie: "__cyd_region=US-CA" }), config());
    expect(result.forcedRegion).toBe("US-CA");
  });

  it("ignores a malformed DevTools region cookie", () => {
    expect(
      _readRequestConsent(request({ cookie: "__cyd_region=%E0%A4%A" }), config()).forcedRegion,
    ).toBeUndefined();
  });

  it("never reads the DevTools region cookie outside the dev server", () => {
    setDev(false);
    expect(
      _readRequestConsent(request({ cookie: "__cyd_region=US-CA" }), config()).forcedRegion,
    ).toBeUndefined();
  });

  it("ignores the cookie when dev is false even if NODE_ENV is not production", () => {
    setDev(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(
      _readRequestConsent(request({ cookie: "__cyd_region=US-CA" }), config()).forcedRegion,
    ).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("honours the deprecated overrides.regulation alias like the client", () => {
    const result = _readRequestConsent(
      request({ cookie: DECIDED }),
      config({ overrides: { regulation: "CCPA" } } as Partial<CookieYesConfig>),
    );
    expect(result.initialConsent?.regulation).toBe("CCPA");
  });
});

describe("_withRequestRegion", () => {
  const map = { "US-CA": "CCPA" } as const;

  it("gives the browser runtime the region the server read, replacing a configured detector", () => {
    const state = { ..._emptyRequestState(), read: true, region: "US-CA" };
    const result = _withRequestRegion(config({ region: { map, detect: () => "DE" } }), state);
    expect(result.region?.detect?.()).toBe("US-CA");
    expect(result.region?.map).toEqual(map);
  });

  it("uses no region when the server read the request but found no geo header", () => {
    const state = { ..._emptyRequestState(), read: true };
    expect(
      _withRequestRegion(
        config({ region: { map, detect: () => "US-CA" } }),
        state,
      ).region?.detect?.(),
    ).toBeUndefined();
  });

  it("keeps the configured detector when the server read nothing", () => {
    const cfg = config({ region: { map, detect: () => "DE" } });
    expect(_withRequestRegion(cfg, _emptyRequestState())).toBe(cfg);
  });

  it("leaves a config without region detection alone", () => {
    const cfg = config({ regulation: "GDPR" });
    expect(_withRequestRegion(cfg, { ..._emptyRequestState(), read: true, region: "US-CA" })).toBe(
      cfg,
    );
  });
});

describe("_canBeCcpa", () => {
  it("is true when a CCPA regulation can apply to some visitor", () => {
    expect(_canBeCcpa(config({ regulation: "CCPA" }))).toBe(true);
    expect(
      _canBeCcpa(config({ overrides: { regulation: "CCPA" } } as Partial<CookieYesConfig>)),
    ).toBe(true);
    expect(_canBeCcpa(config({ region: { map: { "US-CA": "CCPA" } } }))).toBe(true);
    expect(_canBeCcpa(config({ region: { strictest: "CCPA" } }))).toBe(true);
  });

  it("is false otherwise", () => {
    expect(_canBeCcpa(config({ regulation: "GDPR" }))).toBe(false);
    expect(_canBeCcpa(config({ region: { map: { DE: "GDPR" } } }))).toBe(false);
    expect(_canBeCcpa(config())).toBe(false);
  });
});
