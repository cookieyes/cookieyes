import { describe, expect, it } from "vitest";
import { createVendorLookup, VENDORS } from "../../scanner/vendors.js";

const vendors = createVendorLookup();
const byUrl = (url: string) => vendors.byUrl(new URL(url))?.id;

describe("createVendorLookup", () => {
  it("tells GTM and gtag.js apart on the same host by path", () => {
    expect(byUrl("https://www.googletagmanager.com/gtm.js?id=GTM-1")).toBe("google-tag-manager");
    expect(byUrl("https://www.googletagmanager.com/gtag/js?id=G-1")).toBe("google-tag");
  });

  it("matches Google's country domains and its ad-measurement paths", () => {
    expect(byUrl("https://www.google.co.in/pagead/1p-user-list/1/")).toBe("google-ads");
    expect(byUrl("https://www.google.de/rmkt/collect/1/")).toBe("google-ads");
    expect(byUrl("https://www.google.com/ccm/collect")).toBe("google-ads");
    expect(byUrl("https://www.google.com/recaptcha/api.js")).toBe("recaptcha");
  });

  it("matches subdomains of a host suffix, and only real subdomains", () => {
    expect(byUrl("https://static.hotjar.com/c/hotjar-1.js")).toBe("hotjar");
    expect(byUrl("https://nothotjar.com/x.js")).toBeUndefined();
  });

  it("returns undefined for an unknown host", () => {
    expect(byUrl("https://cdn.example.org/lib.js")).toBeUndefined();
  });

  it("matches cookies by their longest known prefix", () => {
    expect(vendors.byCookie("_ga_ABC123")?.id).toBe("google-analytics");
    expect(vendors.byCookie("_gcl_au")?.id).toBe("google-ads");
    expect(vendors.byCookie("_hjSessionUser_1")?.id).toBe("hotjar");
    expect(vendors.byCookie("cookieyes-consent")?.id).toBe("cookieyes");
    expect(vendors.byCookie("session")).toBeUndefined();
  });

  it("accepts a custom vendor list, so another source can replace the table", () => {
    const custom = createVendorLookup([
      { id: "acme", name: "Acme", category: "analytics", hosts: ["acme.test"] },
    ]);
    expect(custom.byUrl(new URL("https://cdn.acme.test/a.js"))?.name).toBe("Acme");
    expect(custom.byUrl(new URL("https://static.hotjar.com/x.js"))).toBeUndefined();
  });

  it("doesn't name a vendor for a site's own cookie that merely starts the same way", () => {
    expect(vendors.byCookie("IDEMPOTENCY_KEY")).toBeUndefined();
    expect(vendors.byCookie("_gallery_view")).toBeUndefined();
    expect(vendors.byCookie("frontend_session")).toBeUndefined();
    expect(vendors.byCookie("IDE")?.id).toBe("google-ads");
    expect(vendors.byCookie("_gat_UA-1")?.id).toBe("google-analytics");
  });

  it("honours an explicit * prefix", () => {
    expect(vendors.byCookie("_hjid")?.id).toBe("hotjar");
    expect(vendors.byCookie("visitor_id123456")?.id).toBe("pardot");
  });
});

describe("VENDORS", () => {
  const CATEGORIES = ["necessary", "functional", "analytics", "performance", "advertisement"];
  const PRESETS = [
    "ga4",
    "googleAds",
    "googleTagManager",
    "metaPixel",
    "clarity",
    "posthog",
    "segment",
  ];

  it("has unique ids and a built-in category for every vendor", () => {
    const ids = VENDORS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of VENDORS) expect(CATEGORIES).toContain(v.category);
  });

  it("writes hosts as bare lowercase hostnames, with an optional path", () => {
    for (const v of VENDORS) {
      for (const host of v.hosts) expect(host).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/);
    }
  });

  it("only suggests presets @cookieyes/scripts exports", () => {
    for (const v of VENDORS) {
      if (v.preset) expect(PRESETS).toContain(v.preset.slice(0, v.preset.indexOf("(")));
    }
  });
});
