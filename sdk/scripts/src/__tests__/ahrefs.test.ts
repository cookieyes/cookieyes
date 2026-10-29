import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ahrefsAnalytics } from "../ahrefs.js";

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

const KEY = "abc123";
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-ahrefs") as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));

beforeEach(() => {
  document.head.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ahrefsAnalytics()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    await flush();
    expect(el()).toBeNull();
  });

  it("injects the tag with its key on grant (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    set("analytics", true);
    await flush();
    expect(el()?.src).toBe("https://analytics.ahrefs.com/analytics.js");
    expect(el()?.getAttribute("data-key")).toBe(KEY);
    expect(el()?.hasAttribute("data-api")).toBe(false);
    expect(runner.status().ahrefs).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().ahrefs).toBe("active");
  });

  it("does not inject a second tag on a second grant", async () => {
    const { host, set } = makeHost();
    runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    set("analytics", true);
    set("analytics", true);
    await flush();
    expect(document.querySelectorAll("#cky-ahrefs")).toHaveLength(1);
  });

  it("removes the key on revoke and restores it on re-grant, keeping the tag", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    await flush();
    fireLoad();
    await flush();

    set("analytics", false);
    expect(runner.status().ahrefs).toBe("silenced");
    expect(el()).not.toBeNull();
    expect(el()?.hasAttribute("data-key")).toBe(false);

    set("analytics", true);
    expect(runner.status().ahrefs).toBe("active");
    expect(el()?.getAttribute("data-key")).toBe(KEY);
  });

  it("silences a revoke that lands while the tag is still loading", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    await flush();
    set("analytics", false);
    fireLoad();
    await flush();
    expect(runner.status().ahrefs).toBe("silenced");
    expect(el()?.hasAttribute("data-key")).toBe(false);
  });

  it("reuses a silenced tag after a restart instead of injecting a second one", async () => {
    const first = makeHost({ analytics: true });
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY })], first.host);
    await flush();
    fireLoad();
    await flush();
    first.set("analytics", false);
    runner.stop();

    const second = makeHost({ analytics: true });
    const next = runIntegrations([ahrefsAnalytics({ key: KEY })], second.host);
    await flush();
    expect(next.status().ahrefs).toBe("active");
    expect(document.querySelectorAll("#cky-ahrefs")).toHaveLength(1);
    expect(el()?.getAttribute("data-key")).toBe(KEY);
  });

  it("marks error on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY })], host);
    set("analytics", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().ahrefs).toBe("error");
    expect(el()).toBeNull();
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("loads from a custom script URL and event endpoint", async () => {
    const { host, set } = makeHost();
    runIntegrations(
      [
        ahrefsAnalytics({
          key: KEY,
          scriptUrl: "https://example.com/stats/a.js",
          apiUrl: "https://example.com/stats/e",
        }),
      ],
      host,
    );
    set("analytics", true);
    await flush();
    expect(el()?.src).toBe("https://example.com/stats/a.js");
    expect(el()?.getAttribute("data-api")).toBe("https://example.com/stats/e");
  });

  it("honours a custom category", async () => {
    const { host, set } = makeHost();
    runIntegrations([ahrefsAnalytics({ key: KEY, category: "performance" })], host);
    set("analytics", true);
    await flush();
    expect(el()).toBeNull();
    set("performance", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("loads without consent and ignores revokes when requireConsent is false", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([ahrefsAnalytics({ key: KEY, requireConsent: false })], host);
    await flush();
    expect(el()?.getAttribute("data-key")).toBe(KEY);
    fireLoad();
    await flush();
    set("analytics", true);
    set("analytics", false);
    expect(runner.status().ahrefs).toBe("active");
    expect(el()?.getAttribute("data-key")).toBe(KEY);
  });

  it("allows an id override", () => {
    expect(ahrefsAnalytics({ key: KEY }).id).toBe("ahrefs");
    expect(ahrefsAnalytics({ key: KEY, id: "ahrefs2" }).id).toBe("ahrefs2");
  });
});

describe("ahrefsAnalytics() during SSR", () => {
  it("resolves setup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const integration = ahrefsAnalytics({ key: KEY });
      const ctx = { granted: () => true, onConsentChange: () => () => {}, region: REGION };
      const control = await integration.setup(ctx);
      expect(() => (control as { silence: () => void }).silence()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
