import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clarity } from "../clarity.js";

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

const PID = "abc123";
const flush = () => new Promise((r) => setTimeout(r, 0));
const SCRIPT = "cky-clarity";
const el = () => document.getElementById(SCRIPT) as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));

type ClarityFn = ((...a: unknown[]) => void) & { q?: unknown[][] };
const cl = () => (window as unknown as { clarity?: ClarityFn }).clarity;
/** consentv2 payloads the stub queued, in order. */
const consentCalls = () =>
  (cl()?.q ?? [])
    .filter((a) => a[0] === "consentv2")
    .map((a) => a[1] as { ad_Storage: string; analytics_Storage: string });
const lastConsent = () => {
  const calls = consentCalls();
  return calls[calls.length - 1];
};

const clearWindow = () => {
  (window as unknown as { clarity?: unknown }).clarity = undefined;
};

beforeEach(() => {
  document.head.innerHTML = "";
  clearWindow();
});
afterEach(() => {
  clearWindow();
  vi.restoreAllMocks();
});

describe("clarity()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([clarity({ projectId: PID })], host);
    await flush();
    expect(el()).toBeNull();
    expect(cl()).toBeUndefined();
  });

  it("injects the tag on grant and sends consentv2 granted (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([clarity({ projectId: PID })], host);
    set("analytics", true);
    await flush();
    expect(el()?.src).toContain(`clarity.ms/tag/${PID}`);
    expect(cl()).toBeDefined();
    expect(lastConsent()).toEqual({ ad_Storage: "granted", analytics_Storage: "granted" });
    expect(runner.status().clarity).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().clarity).toBe("active");
  });

  it("silences on revoke (consentv2 denied) and resumes on re-grant (granted)", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([clarity({ projectId: PID })], host);
    await flush();
    fireLoad();
    await flush();
    expect(runner.status().clarity).toBe("active");

    set("analytics", false);
    expect(runner.status().clarity).toBe("silenced");
    expect(lastConsent()).toEqual({ ad_Storage: "denied", analytics_Storage: "denied" });

    set("analytics", true);
    expect(runner.status().clarity).toBe("active");
    expect(lastConsent()).toEqual({ ad_Storage: "granted", analytics_Storage: "granted" });
  });

  it("keeps the tag on the page through a revoke (silence, not remove)", async () => {
    const { host, set } = makeHost({ analytics: true });
    runIntegrations([clarity({ projectId: PID })], host);
    await flush();
    fireLoad();
    await flush();
    set("analytics", false);
    expect(el()).not.toBeNull(); // still there, just told to deny
  });

  it("marks error on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([clarity({ projectId: PID })], host);
    set("analytics", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().clarity).toBe("error");
    expect(el()).toBeNull();
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("honours a custom category", async () => {
    const { host, set } = makeHost();
    runIntegrations([clarity({ projectId: PID, category: "session_recording" })], host);
    set("analytics", true); // wrong category — must not load
    await flush();
    expect(el()).toBeNull();
    set("session_recording", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("resolves immediately and grants when the tag is already loaded", async () => {
    const pre = document.createElement("script");
    pre.id = SCRIPT;
    pre.dataset.ckyLoaded = "true";
    document.head.appendChild(pre);
    (window as unknown as { clarity: ClarityFn }).clarity = Object.assign(
      (..._a: unknown[]) => {},
      { q: [] as unknown[][] },
    );

    const { host, set } = makeHost();
    const runner = runIntegrations([clarity({ projectId: PID })], host);
    set("analytics", true);
    await flush();
    expect(runner.status().clarity).toBe("active"); // resolved without waiting for load
  });

  it("allows an id override", () => {
    expect(clarity({ projectId: PID }).id).toBe("clarity");
    expect(clarity({ projectId: PID, id: "clarity2" }).id).toBe("clarity2");
  });
});
