import { afterEach, describe, expect, it, vi } from "vitest";
import { regionFromHeaders, resolveRegion } from "../region.js";

// Minimal Headers-like source for the tests.
function h(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

const map = { "US-CA": "CCPA", US: "DEFAULT", DE: "GDPR" } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveRegion", () => {
  it("maps a detected region to its regulation", () => {
    const d = resolveRegion({ detect: () => "DE", map });
    expect(d).toMatchObject({
      region: "DE",
      regulation: "GDPR",
      source: "detected",
      confidence: "high",
    });
  });

  it("matches the most specific first (US-CA before US)", () => {
    expect(resolveRegion({ detect: () => "US-CA", map }).regulation).toBe("CCPA");
    expect(resolveRegion({ detect: () => "US-TX", map }).regulation).toBe("DEFAULT"); // falls to "US"
  });

  it("falls back to the strictest when the region is unknown", () => {
    const d = resolveRegion({ detect: () => "JP", map });
    expect(d).toMatchObject({ regulation: "GDPR", source: "strictest", confidence: "low" });
  });

  it("falls back to the strictest when detection returns nothing", () => {
    expect(resolveRegion({ detect: () => undefined, map }).regulation).toBe("GDPR");
  });

  it("honours a custom strictest", () => {
    expect(resolveRegion({ detect: () => undefined, strictest: "CCPA" }).regulation).toBe("CCPA");
  });

  it("lets a manual regulation always win", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = resolveRegion({ detect: () => "DE", map }, "CCPA");
    expect(d).toMatchObject({ regulation: "CCPA", source: "manual" });
    expect(warn).toHaveBeenCalled(); // detection + manual set → conflict warning
  });

  describe("GPC", () => {
    it("upgrades DEFAULT to CCPA when GPC is present", () => {
      vi.stubGlobal("navigator", { globalPrivacyControl: true });
      const d = resolveRegion({ detect: () => "US", map });
      expect(d).toMatchObject({ regulation: "CCPA", source: "gpc" });
    });

    it("leaves GDPR as-is (already stricter than CCPA)", () => {
      vi.stubGlobal("navigator", { globalPrivacyControl: true });
      expect(resolveRegion({ detect: () => "DE", map }).regulation).toBe("GDPR");
    });

    it("is ignored when honorGpc is false", () => {
      vi.stubGlobal("navigator", { globalPrivacyControl: true });
      expect(resolveRegion({ detect: () => "US", map, honorGpc: false }).regulation).toBe(
        "DEFAULT",
      );
    });
  });
});

describe("regionFromHeaders", () => {
  it("combines Vercel country + region into US-CA", () => {
    expect(
      regionFromHeaders(h({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" })),
    ).toBe("US-CA");
  });

  it("returns just the country when no region header is present", () => {
    expect(regionFromHeaders(h({ "x-vercel-ip-country": "US" }))).toBe("US");
  });

  it("reads Cloudflare's country header", () => {
    expect(regionFromHeaders(h({ "cf-ipcountry": "DE" }))).toBe("DE");
  });

  it("reads a custom header when asked", () => {
    expect(regionFromHeaders(h({ "x-geo": "US-NY" }), { header: "x-geo" })).toBe("US-NY");
  });

  it("returns undefined when nothing matches", () => {
    expect(regionFromHeaders(h({}))).toBeUndefined();
  });
});
