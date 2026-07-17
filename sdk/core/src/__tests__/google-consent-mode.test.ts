import { afterEach, describe, expect, it } from "vitest";
import { resolveCategories } from "../categories.js";
import { broadcastGoogleConsent, computeGoogleConsent } from "../google-consent-mode.js";

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
