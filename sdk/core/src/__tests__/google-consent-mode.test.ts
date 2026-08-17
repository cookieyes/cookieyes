import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCategories } from "../categories.js";
import {
  broadcastGoogleConsent,
  computeGoogleConsent,
  warnOverlappingGcm,
} from "../google-consent-mode.js";

const resolved = resolveCategories(); // built-in five

afterEach(() => {
  (window as unknown as Record<string, unknown>).dataLayer = undefined;
});

describe("computeGoogleConsent", () => {
  it("denies everything (except security_storage) when nothing is granted", () => {
    const c = computeGoogleConsent(resolved, {
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
    expect(c.analytics_storage).toBe("denied");
    expect(c.ad_storage).toBe("denied");
    expect(c.ad_user_data).toBe("denied");
    expect(c.ad_personalization).toBe("denied");
    expect(c.functionality_storage).toBe("denied");
    expect(c.personalization_storage).toBe("denied");
    // Always granted, never gated.
    expect(c.security_storage).toBe("granted");
  });

  it("maps each category to its GCM signals when granted", () => {
    const c = computeGoogleConsent(resolved, {
      necessary: true,
      functional: true,
      analytics: true,
      performance: true,
      advertisement: true,
    });
    expect(c.analytics_storage).toBe("granted"); // analytics
    expect(c.functionality_storage).toBe("granted"); // functional
    expect(c.personalization_storage).toBe("granted"); // functional
    expect(c.ad_storage).toBe("granted"); // advertisement
    expect(c.ad_user_data).toBe("granted");
    expect(c.ad_personalization).toBe("granted");
  });

  it("grants only the signals of the granted categories", () => {
    const c = computeGoogleConsent(resolved, {
      necessary: true,
      functional: false,
      analytics: true,
      performance: false,
      advertisement: false,
    });
    expect(c.analytics_storage).toBe("granted");
    expect(c.ad_storage).toBe("denied");
    expect(c.functionality_storage).toBe("denied");
  });

  it("works with a custom taxonomy's gcm mapping", () => {
    const custom = resolveCategories([
      { id: "essential", required: true },
      { id: "ads", gcm: ["ad_storage", "ad_user_data", "ad_personalization"] },
    ]);
    const c = computeGoogleConsent(custom, { essential: true, ads: true });
    expect(c.ad_storage).toBe("granted");
    expect(c.analytics_storage).toBe("denied"); // no category maps to it
  });

  describe("when two categories map to the same signal", () => {
    const overlap = resolveCategories([
      { id: "essential", required: true },
      { id: "product_stats", gcm: ["analytics_storage"] },
      { id: "marketing_stats", gcm: ["analytics_storage"] },
    ]);

    it("match 'any' (default): granted if either maps-and-granted", () => {
      const c = computeGoogleConsent(overlap, { product_stats: true, marketing_stats: false });
      expect(c.analytics_storage).toBe("granted");
    });

    it("match 'all': granted only when every mapping category is granted", () => {
      const partial = computeGoogleConsent(
        overlap,
        { product_stats: true, marketing_stats: false },
        "all",
      );
      expect(partial.analytics_storage).toBe("denied"); // one missing → denied

      const full = computeGoogleConsent(
        overlap,
        { product_stats: true, marketing_stats: true },
        "all",
      );
      expect(full.analytics_storage).toBe("granted"); // both granted → granted
    });
  });
});

describe("broadcastGoogleConsent", () => {
  it("no-ops when no dataLayer is present", () => {
    (window as unknown as Record<string, unknown>).dataLayer = undefined;
    expect(() =>
      broadcastGoogleConsent(resolved, { necessary: true, analytics: true }),
    ).not.toThrow();
  });

  it("pushes a gtag-shaped consent update when a dataLayer exists", () => {
    const dataLayer: unknown[] = [];
    (window as unknown as Record<string, unknown>).dataLayer = dataLayer;

    broadcastGoogleConsent(resolved, {
      necessary: true,
      functional: false,
      analytics: true,
      performance: false,
      advertisement: false,
    });

    expect(dataLayer).toHaveLength(1);
    const [command, action, payload] = dataLayer[0] as [string, string, Record<string, string>];
    expect(command).toBe("consent");
    expect(action).toBe("update");
    expect(payload.analytics_storage).toBe("granted");
    expect(payload.ad_storage).toBe("denied");
    expect(payload.security_storage).toBe("granted");
  });
});

describe("warnOverlappingGcm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("warns when two categories map to the same signal", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOverlappingGcm(
      resolveCategories([
        { id: "essential", required: true },
        { id: "product_stats", gcm: ["analytics_storage"] },
        { id: "marketing_stats", gcm: ["analytics_storage"] },
      ]),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('map to the Google signal "analytics_storage"'),
    );
  });

  it("stays quiet for the built-in five (no overlap)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOverlappingGcm(resolveCategories(undefined));
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not treat one category listing a signal twice as an overlap", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnOverlappingGcm(
      resolveCategories([
        { id: "essential", required: true },
        { id: "stats", gcm: ["analytics_storage", "analytics_storage"] },
      ]),
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
