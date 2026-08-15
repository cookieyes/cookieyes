import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapGoogleConsentMode, ga4, googleConsentModeSnippet } from "../google.js";

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
const GTAG = "cky-google-gtag";
const el = () => document.getElementById(GTAG) as HTMLScriptElement | null;
const win = () =>
  window as unknown as {
    dataLayer?: unknown[][] | undefined;
    gtag?: ((...a: unknown[]) => void) | undefined;
    __ckyGcmReady?: boolean | undefined;
  };
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const commands = () => (win().dataLayer ?? []).map((c) => Array.from(c));

beforeEach(() => {
  document.head.innerHTML = "";
  win().dataLayer = undefined;
  win().gtag = undefined;
  win().__ckyGcmReady = undefined;
});
afterEach(() => vi.restoreAllMocks());

describe("googleConsentModeSnippet()", () => {
  it("emits a deny-by-default consent snippet", () => {
    const s = googleConsentModeSnippet();
    expect(s).toContain("dataLayer");
    expect(s).toContain("gtag('consent','default'");
    expect(s).toContain('"analytics_storage":"denied"');
    expect(s).toContain('"security_storage":"granted"');
    expect(s).toContain('"wait_for_update":500');
  });

  it("honours default + waitForUpdate overrides", () => {
    const s = googleConsentModeSnippet({ defaults: { analytics_storage: "granted" }, waitForUpdate: 1000 });
    expect(s).toContain('"analytics_storage":"granted"');
    expect(s).toContain('"wait_for_update":1000');
  });
});

describe("bootstrapGoogleConsentMode()", () => {
  it("sets up dataLayer + gtag and pushes the default once (idempotent)", () => {
    bootstrapGoogleConsentMode();
    expect(win().__ckyGcmReady).toBe(true);
    const cmds = commands();
    expect(cmds.some((c) => c[0] === "consent" && c[1] === "default")).toBe(true);
    const count = commands().length;
    bootstrapGoogleConsentMode(); // second call is a no-op
    expect(commands().length).toBe(count);
  });
});

describe("ga4()", () => {
  it("loads gtag.js immediately and configs the measurement id", async () => {
    bootstrapGoogleConsentMode(); // head snippet did its job
    const { host } = makeHost();
    const runner = runIntegrations([ga4({ measurementId: "G-TEST" })], host);
    await flush();
    expect(el()?.src).toContain("gtag/js?id=G-TEST");
    expect(commands().some((c) => c[0] === "config" && c[1] === "G-TEST")).toBe(true);
    expect(runner.status().ga4).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().ga4).toBe("active");
  });

  it("loads before consent (Consent Mode governs gating, not load)", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost(); // nothing granted
    runIntegrations([ga4({ measurementId: "G-TEST" })], host);
    await flush();
    expect(el()).not.toBeNull(); // loaded regardless of consent
  });

  it("stays loaded on revoke (onRevoke: keep)", async () => {
    bootstrapGoogleConsentMode();
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([ga4({ measurementId: "G-TEST" })], host);
    await flush();
    fireLoad();
    await flush();
    set("analytics", false);
    expect(el()).not.toBeNull();
    expect(runner.status().ga4).toBe("active");
  });

  it("loads gtag.js only once for two Google products (shared library)", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations(
      [ga4({ measurementId: "G-AAA" }), ga4({ measurementId: "G-BBB", id: "ga4-2" })],
      host,
    );
    await flush();
    expect(document.querySelectorAll(`#${GTAG}`).length).toBe(1);
    const configs = commands().filter((c) => c[0] === "config");
    expect(configs.map((c) => c[1])).toEqual(expect.arrayContaining(["G-AAA", "G-BBB"]));
  });

  it("warns and self-bootstraps if the head snippet was not set", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { host } = makeHost();
    runIntegrations([ga4({ measurementId: "G-TEST" })], host);
    await flush();
    expect(spy).toHaveBeenCalled();
    expect(win().__ckyGcmReady).toBe(true); // fell back to a default
    expect(el()).not.toBeNull();
  });

  it("allows an id override", () => {
    expect(ga4({ measurementId: "G-X" }).id).toBe("ga4");
    expect(ga4({ measurementId: "G-X", id: "g2" }).id).toBe("g2");
  });
});
