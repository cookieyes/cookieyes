import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _clearStopHandlers,
  applyStopHandlers,
  initStopHandlers,
  registerStopHandler,
  resolveBuiltInIntegration,
} from "../stop-handlers.js";
import type { ConsentCategory } from "../types.js";

const ALL_DENIED: Record<ConsentCategory, boolean> = {
  necessary: true,
  functional: false,
  analytics: false,
  performance: false,
  advertisement: false,
};
const ALL_GRANTED: Record<ConsentCategory, boolean> = {
  necessary: true,
  functional: true,
  analytics: true,
  performance: true,
  advertisement: true,
};

beforeEach(() => {
  _clearStopHandlers();
});
afterEach(() => {
  _clearStopHandlers();
  vi.restoreAllMocks();
});

describe("resolveBuiltInIntegration", () => {
  it("ga4 is a clean-stop handler using Consent Mode v2 (gtag consent update)", () => {
    const gtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtag;
    const h = resolveBuiltInIntegration({ vendor: "ga4" });
    expect(h.category).toBe("analytics");
    if ("needsReload" in h) throw new Error("ga4 should be a clean-stop handler");

    h.stop();
    expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
    h.resume?.();
    expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });
  });

  it("meta is a clean-stop handler that calls fbq consent revoke/grant", () => {
    const fbq = vi.fn();
    (window as unknown as Record<string, unknown>).fbq = fbq;
    const h = resolveBuiltInIntegration({ vendor: "meta" });
    expect(h.category).toBe("advertisement");
    if ("needsReload" in h) throw new Error("meta should be a clean-stop handler");

    h.stop();
    expect(fbq).toHaveBeenCalledWith("consent", "revoke");
    h.resume?.();
    expect(fbq).toHaveBeenCalledWith("consent", "grant");
  });

  it("gtm is a clean-stop handler using Consent Mode v2 (verified: GTM honors it)", () => {
    const gtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtag;
    const h = resolveBuiltInIntegration({ vendor: "gtm" });
    if ("needsReload" in h) throw new Error("gtm should be a clean-stop handler");
    h.stop();
    expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
  });

  it.each([
    "tiktok",
    "linkedin",
    "hotjar",
    "segment",
  ] as const)("%s is reload-only (no confident documented runtime stop)", (vendor) => {
    const h = resolveBuiltInIntegration({ vendor });
    expect("needsReload" in h && h.needsReload).toBe(true);
  });

  it("honours a category override", () => {
    const h = resolveBuiltInIntegration({ vendor: "meta", category: "analytics" });
    expect(h.category).toBe("analytics");
  });
});

describe("applyStopHandlers", () => {
  it("runs stop() once when the category is denied, and resume() when re-granted", () => {
    const stop = vi.fn();
    const resume = vi.fn();
    registerStopHandler({ id: "x", category: "analytics", stop, resume });

    // denied → stop once
    applyStopHandlers(ALL_DENIED);
    applyStopHandlers(ALL_DENIED); // idempotent — no second stop
    expect(stop).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();

    // granted → resume once
    applyStopHandlers(ALL_GRANTED);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("flags a reload-only handler only on a genuine revoke (granted → denied)", () => {
    registerStopHandler({ id: "hotjar", category: "analytics", needsReload: true });

    // Standing/first-time reject (never granted) → no notice, it never ran.
    expect(applyStopHandlers(ALL_DENIED).reloadRequiredBy).toEqual([]);

    // Grant (tool now presumed active), then revoke → notice.
    applyStopHandlers(ALL_GRANTED);
    expect(applyStopHandlers(ALL_DENIED).reloadRequiredBy).toEqual(["hotjar"]);

    // Re-grant clears it; a second grant→deny flags again.
    applyStopHandlers(ALL_GRANTED);
    expect(applyStopHandlers(ALL_DENIED).reloadRequiredBy).toEqual(["hotjar"]);
  });

  it("falls back to reload when a clean stop() throws — never propagates", () => {
    registerStopHandler({
      id: "boom",
      category: "analytics",
      stop: () => {
        throw new Error("script not ready");
      },
    });
    const result = applyStopHandlers(ALL_DENIED);
    expect(result.reloadRequiredBy).toEqual(["boom"]);
  });

  it("a failing resume() is swallowed (non-fatal)", () => {
    registerStopHandler({
      id: "r",
      category: "analytics",
      stop: () => undefined,
      resume: () => {
        throw new Error("resume failed");
      },
    });
    applyStopHandlers(ALL_DENIED);
    expect(() => applyStopHandlers(ALL_GRANTED)).not.toThrow();
  });
});

describe("initStopHandlers (load-time, both directions)", () => {
  it("fires resume() for a category already granted at load (returning consenter)", () => {
    const stop = vi.fn();
    const resume = vi.fn();
    registerStopHandler({ id: "x", category: "analytics", stop, resume });

    initStopHandlers(ALL_GRANTED);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  it("fires stop() for a category already denied at load", () => {
    const stop = vi.fn();
    const resume = vi.fn();
    registerStopHandler({ id: "x", category: "analytics", stop, resume });

    initStopHandlers(ALL_DENIED);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();
  });

  it("raises no reload notice at load, but seeds reload-only active state for a returning consenter", () => {
    registerStopHandler({ id: "hotjar", category: "analytics", needsReload: true });

    // Returning visitor who had analytics granted: no notice at load itself...
    initStopHandlers(ALL_GRANTED);
    // ...but a later live revoke IS detected (seeded as active).
    expect(applyStopHandlers(ALL_DENIED).reloadRequiredBy).toEqual(["hotjar"]);
  });

  it("does not flag a reload-only tool that was already denied at load", () => {
    registerStopHandler({ id: "hotjar", category: "analytics", needsReload: true });
    initStopHandlers(ALL_DENIED); // never active
    expect(applyStopHandlers(ALL_DENIED).reloadRequiredBy).toEqual([]);
  });

  it("seeds transition state so a later revoke still fires stop() exactly once", () => {
    const stop = vi.fn();
    registerStopHandler({ id: "x", category: "analytics", stop });

    initStopHandlers(ALL_GRANTED); // granted at load → not stopped
    applyStopHandlers(ALL_DENIED); // now revoked → stop fires
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
