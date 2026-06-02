import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentManager } from "../manager.js";

// Mock browser APIs
beforeEach(() => {
  // Reset document.cookie between tests
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: "",
  });
  // Mock crypto.getRandomValues
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    writable: true,
  });
});

describe("createConsentManager", () => {
  it("creates a manager with DEFAULT regulation when no cookie exists", () => {
    const mgr = createConsentManager({ regulation: "DEFAULT" });
    expect(mgr.hasActed).toBe(false);
    expect(mgr.regulation).toBe("DEFAULT");
    expect(mgr.categories.necessary).toBe(true);
  });

  it("acceptAll sets all categories to true", async () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    const listener = vi.fn();
    mgr.subscribe(listener);
    mgr.acceptAll();
    expect(mgr.hasActed).toBe(true);
    expect(mgr.categories.analytics).toBe(true);
    expect(mgr.categories.advertisement).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejectAll sets non-necessary categories to false", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    mgr.rejectAll();
    expect(mgr.hasActed).toBe(true);
    expect(mgr.categories.necessary).toBe(true);
    expect(mgr.categories.analytics).toBe(false);
    expect(mgr.categories.functional).toBe(false);
  });

  it("acceptSelected sets only specified categories", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    mgr.acceptSelected(["analytics", "functional"]);
    expect(mgr.categories.analytics).toBe(true);
    expect(mgr.categories.functional).toBe(true);
    expect(mgr.categories.performance).toBe(false);
    expect(mgr.categories.advertisement).toBe(false);
  });

  it("updateCategory changes a single category", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    mgr.updateCategory("analytics", true);
    expect(mgr.categories.analytics).toBe(true);
  });

  it("cannot toggle necessary off", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    mgr.updateCategory("necessary", false);
    expect(mgr.categories.necessary).toBe(true);
  });

  it("subscribe returns an unsubscribe function", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    const listener = vi.fn();
    const unsub = mgr.subscribe(listener);
    mgr.acceptAll();
    expect(listener).toHaveBeenCalledOnce();
    unsub();
    mgr.rejectAll();
    expect(listener).toHaveBeenCalledOnce(); // not called again
  });

  it("showPreferences sets isPreferencesOpen to true", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    expect(mgr.isPreferencesOpen).toBe(false);
    mgr.showPreferences();
    expect(mgr.isPreferencesOpen).toBe(true);
  });

  it("hidePreferences closes the dialog", () => {
    const mgr = createConsentManager({ regulation: "GDPR" });
    mgr.showPreferences();
    mgr.hidePreferences();
    expect(mgr.isPreferencesOpen).toBe(false);
  });

  it("CCPA defaults: all categories true (opt-out model)", () => {
    const mgr = createConsentManager({ regulation: "CCPA" });
    expect(mgr.categories.analytics).toBe(true);
    expect(mgr.categories.advertisement).toBe(true);
    expect(mgr.hasActed).toBe(false);
  });

  it("calls onConsentReady after initialization", async () => {
    const onConsentReady = vi.fn();
    createConsentManager({ regulation: "GDPR", onConsentReady });
    await Promise.resolve(); // flush microtask
    expect(onConsentReady).toHaveBeenCalledOnce();
  });

  it("calls onConsentUpdate after acceptAll", async () => {
    const onConsentUpdate = vi.fn();
    const mgr = createConsentManager({ regulation: "GDPR", onConsentUpdate });
    mgr.acceptAll();
    expect(onConsentUpdate).toHaveBeenCalledOnce();
  });

  describe("reloadOnRevoke", () => {
    let reloadSpy: ReturnType<typeof vi.fn>;
    let originalLocation: Location;

    beforeEach(() => {
      reloadSpy = vi.fn();
      originalLocation = window.location;
      // jsdom's location.reload is non-configurable, so replace the whole object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = {
        ...originalLocation,
        reload: reloadSpy,
        href: originalLocation.href,
      };
    });

    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = originalLocation;
    });

    it("does not reload when reloadOnRevoke is false (default)", () => {
      const mgr = createConsentManager({ regulation: "GDPR" });
      mgr.acceptAll();
      mgr.rejectAll();
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("reloads when a previously-allowed category is revoked", () => {
      const mgr = createConsentManager({
        regulation: "GDPR",
        reloadOnRevoke: true,
      });
      mgr.acceptAll();
      expect(reloadSpy).not.toHaveBeenCalled(); // first accept — nothing to revoke
      mgr.rejectAll();
      expect(reloadSpy).toHaveBeenCalledOnce(); // analytics/etc went true → false
    });

    it("does not reload when consent is only added", () => {
      const mgr = createConsentManager({
        regulation: "GDPR",
        reloadOnRevoke: true,
      });
      // GDPR default: only necessary=true. acceptAll adds others — no revoke.
      mgr.acceptAll();
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it("reloads on CCPA opt-out (rejectAll from default-true)", () => {
      const mgr = createConsentManager({
        regulation: "CCPA",
        reloadOnRevoke: true,
      });
      // CCPA default: all true. Reject revokes everything → reload.
      mgr.rejectAll();
      expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it("reloads on dialog save when a category was unchecked", () => {
      const mgr = createConsentManager({
        regulation: "GDPR",
        reloadOnRevoke: true,
      });
      mgr.acceptAll();
      mgr.updateCategory("analytics", false);
      mgr.savePreferences();
      expect(reloadSpy).toHaveBeenCalledOnce();
    });
  });
});
