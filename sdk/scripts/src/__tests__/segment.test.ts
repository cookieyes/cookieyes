import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { segment } from "../segment.js";

const REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};

function makeHost(initial: Record<string, boolean> = {}) {
  const consent: Record<string, boolean> = { ...initial };
  const subs = new Set<() => void>();
  const host: IntegrationHost = {
    granted: (c) => consent[c] === true,
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    region: REGION,
  };
  return {
    host,
    set(category: string, value: boolean) {
      consent[category] = value;
      for (const fn of [...subs]) fn();
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const SCRIPT = "cky-segment-analytics";
const el = () => document.getElementById(SCRIPT) as HTMLScriptElement | null;
const analytics = () => (window as unknown as { analytics?: unknown[] }).analytics;
/** Simulate analytics.min.js finishing (jsdom never fires load for external src). */
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  (window as unknown as { analytics?: unknown }).analytics = undefined;
});
afterEach(() => {
  (window as unknown as { analytics?: unknown }).analytics = undefined;
  vi.restoreAllMocks();
});

describe("segment()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([segment({ writeKey: "wk_test" })], host);
    await flush();
    expect(el()).toBeNull();
    expect(analytics()).toBeUndefined();
  });

  it("injects Segment on grant (loading → active on script load), queuing page()", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([segment({ writeKey: "wk_test" })], host);
    set("analytics", true);
    await flush();
    // Script injected, stub queuing, but not yet loaded → status "loading".
    expect(el()?.src).toContain("wk_test/analytics.min.js");
    expect((analytics() as unknown[]).length).toBeGreaterThan(0); // page() queued
    expect(runner.status().segment).toBe("loading");
    // analytics.min.js finishes → "active".
    fireLoad();
    await flush();
    expect(runner.status().segment).toBe("active");
  });

  it("fully removes Segment on revoke", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([segment({ writeKey: "wk_test" })], host);
    await flush();
    fireLoad();
    await flush();
    expect(runner.status().segment).toBe("active");
    set("analytics", false);
    expect(el()).toBeNull();
    expect(analytics()).toBeUndefined();
    expect(runner.status().segment).toBe("removed");
  });

  it("re-loads cleanly on re-grant", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([segment({ writeKey: "wk_test" })], host);
    set("analytics", true);
    await flush();
    fireLoad();
    await flush();
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull();
    fireLoad();
    await flush();
    expect(runner.status().segment).toBe("active");
  });

  it("queues a track() call made right after consent (the stub)", async () => {
    const { host, set } = makeHost();
    runIntegrations([segment({ writeKey: "wk_test" })], host);
    set("analytics", true);
    await flush();
    (analytics() as unknown as { track: (e: string, p: unknown) => void }).track("Test", { a: 1 });
    const queued = analytics() as unknown[];
    expect(queued.some((c) => Array.isArray(c) && c[0] === "track")).toBe(true);
  });

  it("marks error on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([segment({ writeKey: "wk_test" })], host);
    set("analytics", true);
    await flush();
    fireError(); // analytics.min.js fails to load
    await flush();
    expect(runner.status().segment).toBe("error");
    expect(el()).toBeNull(); // removed so a retry can re-inject
    // Next consent change retries.
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull(); // re-injected
  });

  it("honours a custom category", async () => {
    const { host, set } = makeHost();
    runIntegrations([segment({ writeKey: "wk_test", category: "marketing" })], host);
    set("analytics", true); // wrong category — must not load
    await flush();
    expect(el()).toBeNull();
    set("marketing", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("resolves immediately when the Segment script is already loaded", async () => {
    // A pre-existing, already-loaded Segment script (e.g. left by an earlier load).
    const pre = document.createElement("script");
    pre.id = SCRIPT;
    pre.dataset.ckyLoaded = "true";
    document.head.appendChild(pre);
    (window as unknown as { analytics: unknown[] }).analytics = Object.assign([], {
      invoked: true,
    });
    const { host, set } = makeHost();
    const runner = runIntegrations([segment({ writeKey: "wk_test" })], host);
    set("analytics", true);
    await flush();
    expect(runner.status().segment).toBe("active"); // resolved without waiting for load
  });

  it("allows an id override (for more than one source)", () => {
    expect(segment({ writeKey: "wk_test" }).id).toBe("segment");
    expect(segment({ writeKey: "wk_test", id: "seg2" }).id).toBe("seg2");
  });
});
