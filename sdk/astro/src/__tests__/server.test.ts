import { describe, expect, it } from "vitest";
import { getServerConsent, getServerRegion } from "../server.js";
import { _defaultLocals, _readRequestConsent } from "../server-consent.js";

const CONFIG = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } } as const;
const DECIDED = "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,analytics:yes";

function context(values: Record<string, string>, prerendered = false) {
  const request = new Request("https://example.com/", { headers: values });
  const cookieyes = prerendered
    ? _defaultLocals(CONFIG)
    : _readRequestConsent(request.headers, CONFIG, false);
  return { request, locals: { cookieyes } };
}

describe("getServerConsent", () => {
  it("returns the stored decision, or null", () => {
    expect(getServerConsent(context({ cookie: `cookieyes-consent=${DECIDED}` }))?.hasActed).toBe(
      true,
    );
    expect(getServerConsent(context({}))).toBeNull();
  });

  it("returns null without the integration and on a prerendered page", () => {
    expect(getServerConsent({ request: new Request("https://example.com/"), locals: {} })).toBe(
      null,
    );
    expect(getServerConsent(context({ cookie: `cookieyes-consent=${DECIDED}` }, true))).toBeNull();
  });
});

describe("getServerRegion", () => {
  it("reports the region and the header that gave it, as @cookieyes/nextjs does", () => {
    expect(
      getServerRegion(
        context({
          "x-vercel-ip-country": "US",
          "x-vercel-ip-country-region": "CA",
          "sec-gpc": "1",
        }),
      ),
    ).toEqual({
      region: "US-CA",
      drivingSignal: { header: "x-vercel-ip-country-region", value: "CA" },
      gpc: true,
      forcedRegion: undefined,
    });
    expect(getServerRegion(context({ "cf-ipcountry": "DE" })).drivingSignal).toEqual({
      header: "cf-ipcountry",
      value: "DE",
    });
    expect(getServerRegion(context({})).drivingSignal).toBeUndefined();
  });

  it("is empty on a prerendered page, whatever the build-time headers say", () => {
    expect(getServerRegion(context({ "cf-ipcountry": "DE" }, true))).toEqual({
      region: undefined,
      drivingSignal: undefined,
      gpc: false,
      forcedRegion: undefined,
    });
  });
});
