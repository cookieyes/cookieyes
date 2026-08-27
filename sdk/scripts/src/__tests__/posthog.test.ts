import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { posthog, posthogSync } from "../posthog.js";

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

const KEY = "phc_test";
const flush = () => new Promise((r) => setTimeout(r, 0));
const SCRIPT = "cky-posthog";
const el = () => document.getElementById(SCRIPT) as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));

type Stub = unknown[] & { _i?: unknown[]; [k: string]: unknown };
const ph = () => (window as unknown as { posthog?: Stub }).posthog;
/** Method calls the stub queued, e.g. ["opt_out_capturing"]. */
const called = (method: string) => (ph() ?? []).some((c) => Array.isArray(c) && c[0] === method);
/** The init config the stub recorded: `_i` holds `[token, config, name]`. */
const initConfig = () =>
  ((ph()?._i?.[0] as unknown[] | undefined)?.[1] ?? {}) as Record<string, unknown>;

const clearWindow = () => {
  const w = window as unknown as { posthog?: unknown; __ckyPosthogInit?: unknown };
  w.posthog = undefined;
  w.__ckyPosthogInit = undefined;
};

beforeEach(() => {
  document.head.innerHTML = "";
  clearWindow();
});
afterEach(() => {
  clearWindow();
  vi.restoreAllMocks();
});

describe("posthog() — stop mode", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([posthog({ apiKey: KEY, onReject: "stop" })], host);
    await flush();
    expect(el()).toBeNull();
    expect(ph()).toBeUndefined();
  });

  it("injects and inits on grant (loading → active), no cookieless_mode", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "stop" })], host);
    set("analytics", true);
    await flush();
    expect(el()?.src).toContain("/static/array.js");
    expect(initConfig().api_host).toBe("https://us.i.posthog.com");
    expect(initConfig().cookieless_mode).toBeUndefined();
    expect(runner.status().posthog).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().posthog).toBe("active");
  });

  it("removes script and clears cookie + storage on revoke", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "stop" })], host);
    await flush();
    fireLoad();
    await flush();
    document.cookie = `ph_${KEY}_posthog=abc`;
    window.localStorage.setItem(`ph_${KEY}_posthog`, "1");
    window.localStorage.setItem(`__ph_opt_in_out_${KEY}`, "0");

    // Record the opt-out call teardown makes (it stops PostHog's own persistence
    // first, so it can't rewrite the cookie after we clear it).
    const optCalls: string[] = [];
    (window as unknown as { posthog: unknown }).posthog = new Proxy(
      {},
      {
        get:
          (_t, p: string) =>
          (..._a: unknown[]) =>
            optCalls.push(p),
      },
    );

    set("analytics", false);
    expect(optCalls).toContain("opt_out_capturing");
    expect(runner.status().posthog).toBe("removed");
    expect(el()).toBeNull();
    expect(ph()).toBeUndefined();
    expect(document.cookie).not.toContain(`ph_${KEY}_posthog=abc`);
    expect(window.localStorage.getItem(`ph_${KEY}_posthog`)).toBeNull();
    expect(window.localStorage.getItem(`__ph_opt_in_out_${KEY}`)).toBeNull();
  });

  it("re-injects cleanly on re-grant", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "stop" })], host);
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
    expect(runner.status().posthog).toBe("active");
  });

  it("marks error on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "stop" })], host);
    set("analytics", true);
    await flush();
    fireError(); // array.js fails to load
    await flush();
    expect(runner.status().posthog).toBe("error");
    expect(el()).toBeNull(); // removed so a retry can re-inject
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull(); // re-injected
  });
});

describe("posthog() — anonymous mode", () => {
  it("loads immediately with cookieless_mode, and opts out before consent", async () => {
    const { host } = makeHost();
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "anonymous" })], host);
    await flush();
    expect(el()).not.toBeNull(); // loaded immediately, no consent yet
    expect(initConfig().cookieless_mode).toBe("on_reject");
    fireLoad();
    await flush();
    expect(runner.status().posthog).toBe("silenced"); // engine silenced (not granted)
    expect(called("opt_out_capturing")).toBe(true);
    expect(called("opt_in_capturing")).toBe(false);
  });

  it("resumes (opt_in) on grant and silences (opt_out) again on revoke", async () => {
    const { host, set } = makeHost();
    runIntegrations([posthog({ apiKey: KEY, onReject: "anonymous" })], host);
    await flush();
    fireLoad();
    await flush();
    set("analytics", true);
    expect(called("opt_in_capturing")).toBe(true);
    set("analytics", false);
    // opt_out was called (both before consent and now) — at least once.
    expect(
      (ph() ?? []).filter((c) => Array.isArray(c) && c[0] === "opt_out_capturing").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("opts in during setup for a visitor already granted at load", async () => {
    const { host } = makeHost({ analytics: true });
    const runner = runIntegrations([posthog({ apiKey: KEY, onReject: "anonymous" })], host);
    await flush();
    fireLoad();
    await flush();
    expect(runner.status().posthog).toBe("active");
    expect(called("opt_in_capturing")).toBe(true);
  });
});

describe("posthog() — config", () => {
  it("maps region eu to the eu host", async () => {
    const { host, set } = makeHost();
    runIntegrations([posthog({ apiKey: KEY, onReject: "stop", region: "eu" })], host);
    set("analytics", true);
    await flush();
    expect(initConfig().api_host).toBe("https://eu.i.posthog.com");
    expect(el()?.src).toContain("eu-assets.i.posthog.com");
  });

  it("apiHost overrides region (self-hosted)", async () => {
    const { host, set } = makeHost();
    runIntegrations(
      [posthog({ apiKey: KEY, onReject: "stop", region: "eu", apiHost: "https://ph.example.com" })],
      host,
    );
    set("analytics", true);
    await flush();
    expect(initConfig().api_host).toBe("https://ph.example.com");
    expect(el()?.src).toBe("https://ph.example.com/static/array.js");
  });

  it("warns and fails safe to stop when onReject is missing (plain JS)", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Simulate a JS caller omitting the required field.
    const integration = posthog({ apiKey: KEY } as unknown as Parameters<typeof posthog>[0]);
    expect(spy).toHaveBeenCalled();
    expect(integration.load).toBe("afterConsent"); // "stop" wiring
    expect(integration.onRevoke).toBe("remove");
  });

  it("allows an id override", () => {
    expect(posthog({ apiKey: KEY, onReject: "stop" }).id).toBe("posthog");
    expect(posthog({ apiKey: KEY, onReject: "stop", id: "ph2" }).id).toBe("ph2");
  });

  it("never reads PostHog's own consent check", async () => {
    const { host, set } = makeHost();
    runIntegrations([posthog({ apiKey: KEY, onReject: "anonymous" })], host);
    await flush();
    fireLoad();
    await flush();
    set("analytics", true);
    set("analytics", false);
    expect(called("has_opted_in_capturing")).toBe(false);
    expect(called("has_opted_out_capturing")).toBe(false);
  });
});

describe("posthogSync() — sync-only", () => {
  function withExistingPosthog() {
    // A PostHog the customer already loaded: a plain object recording method calls.
    const calls: unknown[][] = [];
    const stub = new Proxy(
      {},
      {
        get:
          (_t, prop: string) =>
          (...args: unknown[]) =>
            calls.push([prop, ...args]),
      },
    );
    (window as unknown as { posthog: unknown }).posthog = stub;
    return calls;
  }

  it("injects nothing and opts out before consent, opts in on grant", async () => {
    const calls = withExistingPosthog();
    const { host, set } = makeHost();
    runIntegrations([posthogSync()], host);
    await flush();
    expect(el()).toBeNull(); // never injects
    expect(calls.some((c) => c[0] === "opt_out_capturing")).toBe(true);
    set("analytics", true);
    expect(calls.some((c) => c[0] === "opt_in_capturing")).toBe(true);
  });

  it("opts in during setup when already granted at load", async () => {
    const calls = withExistingPosthog();
    const { host } = makeHost({ analytics: true });
    runIntegrations([posthogSync()], host);
    await flush();
    expect(calls.some((c) => c[0] === "opt_in_capturing")).toBe(true);
  });

  it("allows an id override", () => {
    expect(posthogSync().id).toBe("posthog");
    expect(posthogSync({ id: "ph-sync" }).id).toBe("ph-sync");
  });
});
