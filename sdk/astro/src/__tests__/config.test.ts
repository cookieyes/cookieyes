import { describe, expect, it } from "vitest";
import { _findFunctionPaths, _mergeConfig, _withRequestRegion } from "../config.js";

describe("_findFunctionPaths", () => {
  it("names every function by its path, through objects and arrays", () => {
    const config = {
      mode: "cookie-only",
      onConsentUpdate: () => undefined,
      region: { map: { DE: "GDPR" }, detect: () => "DE" },
      integrations: [{ id: "a", setup: () => undefined }],
    };
    expect(_findFunctionPaths(config, "cookieyes")).toEqual([
      "cookieyes.onConsentUpdate",
      "cookieyes.region.detect",
      "cookieyes.integrations[0].setup",
    ]);
  });

  it("finds nothing in plain JSON", () => {
    expect(_findFunctionPaths({ a: [1, "b", null], c: { d: true } }, "x")).toEqual([]);
  });
});

describe("_mergeConfig", () => {
  it("lets the client file win per key and merges one level of nesting", () => {
    const detect = () => "US-CA";
    const merged = _mergeConfig(
      { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } }, categories: [{ id: "a" }] },
      { region: { detect }, categories: [{ id: "b" }] },
    );
    expect(merged.region).toEqual({ map: { "US-CA": "CCPA" }, detect });
    expect(merged.categories).toEqual([{ id: "b" }]);
  });

  it("works when either side is missing", () => {
    expect(_mergeConfig(undefined, { mode: "cookie-only" })).toEqual({ mode: "cookie-only" });
    expect(_mergeConfig({ mode: "cookie-only" }, undefined)).toEqual({ mode: "cookie-only" });
  });
});

describe("_withRequestRegion", () => {
  const config = { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } } as const;

  it("replaces the detector with the region the server read", () => {
    const out = _withRequestRegion(config, { read: true, region: "US-CA" });
    expect(out.region?.detect?.()).toBe("US-CA");
    expect(out.region?.map).toEqual({ "US-CA": "CCPA" });
  });

  it("lets the DevTools override the server honoured win, so both sides pick one regulation", () => {
    const out = _withRequestRegion(config, { read: true, region: "DE", forcedRegion: "US-CA" });
    expect(out.region?.detect?.()).toBe("US-CA");
  });

  it("keeps the config when the request was not read or no region is configured", () => {
    expect(_withRequestRegion(config, { read: false, region: undefined })).toBe(config);
    const plain = { mode: "cookie-only" } as const;
    expect(_withRequestRegion(plain, { read: true, region: "DE" })).toBe(plain);
  });
});
