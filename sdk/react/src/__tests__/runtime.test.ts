import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieYes, getCookieYes, resetCookieYes } from "../runtime.js";

function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

beforeEach(clearCookie);
afterEach(() => {
  resetCookieYes();
  clearCookie();
});

describe("createCookieYes() builder validation", () => {
  it("throws when .mount() is called before .mode()", () => {
    expect(() => createCookieYes().mount()).toThrow(/\.mode\(\) is required/);
  });

  it("throws when self-hosted mode has neither backend nor backendURL", () => {
    expect(() => createCookieYes().mode("self-hosted").mount()).toThrow(
      /requires either \.backend\(\.\.\.\) or \.backendURL\(\.\.\.\)/,
    );
  });

  it("self-hosted mounts when a backendURL is supplied", () => {
    expect(() =>
      createCookieYes().mode("self-hosted").backendURL("https://example.com/consent").mount(),
    ).not.toThrow();
  });

  it("offline mounts and registers the singleton", () => {
    const runtime = createCookieYes().mode("offline").regulation("GDPR").mount();
    expect(getCookieYes()).toBe(runtime);
  });
});

describe("getCookieYes() / resetCookieYes()", () => {
  it("throws before any runtime is mounted", () => {
    expect(() => getCookieYes()).toThrow(/No runtime is registered/);
  });

  it("resetCookieYes() clears the registered runtime", () => {
    createCookieYes().mode("offline").mount();
    expect(getCookieYes()).toBeDefined();
    resetCookieYes();
    expect(() => getCookieYes()).toThrow(/No runtime is registered/);
  });
});

describe("runtime snapshot + actions", () => {
  it("defaults to necessary-only with hasActed=false", () => {
    const rt = createCookieYes().mode("offline").regulation("GDPR").mount();
    const snap = rt.getSnapshot();
    expect(snap.hasActed).toBe(false);
    expect(snap.regulation).toBe("GDPR");
    expect(snap.isPreferencesOpen).toBe(false);
    expect(snap.isOptOutOpen).toBe(false);
    expect(snap.categories).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("acceptAll() grants every category and marks acted", () => {
    const rt = createCookieYes().mode("offline").mount();
    rt.manager.acceptAll();
    const snap = rt.getSnapshot();
    expect(snap.hasActed).toBe(true);
    expect(Object.values(snap.categories).every(Boolean)).toBe(true);
  });

  it("rejectAll() keeps only the necessary category", () => {
    const rt = createCookieYes().mode("offline").mount();
    rt.manager.rejectAll();
    const snap = rt.getSnapshot();
    expect(snap.hasActed).toBe(true);
    expect(snap.categories).toEqual({
      necessary: true,
      functional: false,
      analytics: false,
      performance: false,
      advertisement: false,
    });
  });

  it("showOptOut()/hideOptOut() toggle the flag and notify subscribers", () => {
    const rt = createCookieYes().mode("offline").mount();
    let notified = 0;
    rt.subscribe(() => {
      notified += 1;
    });
    rt.showOptOut();
    expect(rt.getSnapshot().isOptOutOpen).toBe(true);
    rt.hideOptOut();
    expect(rt.getSnapshot().isOptOutOpen).toBe(false);
    expect(notified).toBeGreaterThanOrEqual(2);
  });

  it("stops notifying after unsubscribe", () => {
    const rt = createCookieYes().mode("offline").mount();
    let fired = 0;
    const unsub = rt.subscribe(() => {
      fired += 1;
    });
    rt.manager.acceptAll();
    expect(fired).toBeGreaterThanOrEqual(1);
    unsub();
    const snapshot = fired;
    rt.manager.rejectAll();
    expect(fired).toBe(snapshot);
  });

  it("getServerSnapshot() returns the frozen SSR fallback", () => {
    const rt = createCookieYes().mode("offline").mount();
    const ssr = rt.getServerSnapshot();
    expect(ssr.hasActed).toBe(false);
    expect(ssr.regulation).toBe("DEFAULT");
    expect(ssr.categories.necessary).toBe(true);
  });

  it("showOptOut/hideOptOut are idempotent (no-op when already in that state)", () => {
    const rt = createCookieYes().mode("offline").mount();
    let notified = 0;
    rt.subscribe(() => {
      notified += 1;
    });
    rt.hideOptOut(); // already closed → no-op, no notify
    rt.showOptOut();
    rt.showOptOut(); // already open → no-op
    expect(rt.getSnapshot().isOptOutOpen).toBe(true);
    expect(notified).toBe(1);
  });
});

describe("builder option plumbing", () => {
  it("threads every option through to a working runtime", async () => {
    const onConsentReady = vi.fn();
    const onConsentUpdate = vi.fn();
    const persist = vi.fn();

    const rt = createCookieYes()
      .mode("self-hosted")
      .backend({ persist })
      .apiKey("k")
      .regulation("GDPR")
      .colorScheme("dark")
      .theme({ primaryColor: "#123456" })
      .i18n({ locale: "en" })
      .blockNetwork({
        rules: [{ id: "ga", domain: "google-analytics.com", category: "analytics" }],
      })
      .reloadOnRevoke(false)
      .onConsentReady(onConsentReady)
      .onConsentUpdate(onConsentUpdate)
      .mount();

    expect(rt.theme).toEqual({ primaryColor: "#123456" });
    expect(rt.colorScheme).toBe("dark");

    // onConsentReady fires on a microtask
    await Promise.resolve();
    expect(onConsentReady).toHaveBeenCalledTimes(1);

    rt.manager.acceptAll();
    expect(onConsentUpdate).toHaveBeenCalled();
    expect(persist).toHaveBeenCalled();
  });

  it("injects the stylesheet and re-injects (removing the old) on a second mount", () => {
    createCookieYes().mode("offline").theme({ primaryColor: "#abcabc" }).mount();
    expect(document.getElementById("cookieyes-styles")).not.toBeNull();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createCookieYes().mode("offline").mount(); // second mount → warns + replaces styles
    expect(warn).toHaveBeenCalled();
    expect(document.querySelectorAll("#cookieyes-styles").length).toBe(1);
    warn.mockRestore();
  });
});
