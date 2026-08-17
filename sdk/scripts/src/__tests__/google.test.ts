import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapGoogleConsentMode,
  ga4,
  googleAds,
  googleConsentModeSnippet,
  googleTagManager,
} from "../google.js";

const REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};

function makeHost(initial: Record<string, boolean> = {}, region: RegionDecision = REGION) {
  const consent: Record<string, boolean> = { ...initial };
  const subs = new Set<() => void>();
  const host: IntegrationHost = {
    granted: (c) => consent[c] === true,
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    region,
  };
  return {
    host,
    set(category: string, value: boolean) {
      consent[category] = value;
      for (const fn of [...subs]) fn();
    },
  };
}

const CCPA_REGION: RegionDecision = { ...REGION, regulation: "CCPA", region: "US-CA" };

const flush = () => new Promise((r) => setTimeout(r, 0));
const GTAG = "cky-google-gtag";
const el = () => document.getElementById(GTAG) as HTMLScriptElement | null;
const win = () =>
  window as unknown as {
    dataLayer?: unknown[][] | undefined;
    gtag?: ((...a: unknown[]) => void) | undefined;
    __ckyGcmReady?: boolean | undefined;
    __ckyGoogleOverlapWarned?: boolean | undefined;
    __ckyGtagProducts?: Set<string> | undefined;
  };
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const commands = () => (win().dataLayer ?? []).map((c) => Array.from(c));

beforeEach(() => {
  document.head.innerHTML = "";
  win().dataLayer = undefined;
  win().gtag = undefined;
  win().__ckyGcmReady = undefined;
  win().__ckyGoogleOverlapWarned = undefined;
  win().__ckyGtagProducts = undefined;
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

  it("emits url_passthrough and ads_data_redaction only when enabled", () => {
    expect(googleConsentModeSnippet()).not.toContain("url_passthrough");
    const s = googleConsentModeSnippet({ urlPassthrough: true, adsDataRedaction: true });
    expect(s).toContain("gtag('set','url_passthrough',true)");
    expect(s).toContain("gtag('set','ads_data_redaction',true)");
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

  it("passes extra config params to gtag (e.g. send_page_view for SPAs)", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations([ga4({ measurementId: "G-P", params: { send_page_view: false } })], host);
    await flush();
    const cfg = commands().find((c) => c[0] === "config" && c[1] === "G-P");
    expect(cfg?.[2]).toEqual({ send_page_view: false });
  });

  it("basic consent mode: loads only after consent, and removes on revoke", async () => {
    bootstrapGoogleConsentMode();
    const { host, set } = makeHost();
    runIntegrations([ga4({ measurementId: "G-B", consentMode: "basic" })], host);
    await flush();
    expect(el()).toBeNull(); // advanced would have loaded already; basic waits
    set("analytics", true);
    await flush();
    fireLoad();
    await flush();
    expect(el()).not.toBeNull(); // loaded on grant
    set("analytics", false);
    expect(el()).toBeNull(); // removed on revoke — not kept sending cookieless pings
  });

  it("basic teardown clears only this product's cookies (not the other product's)", async () => {
    bootstrapGoogleConsentMode();
    const writes: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((v: string) => writes.push(v));
    const { host, set } = makeHost({ analytics: true });
    runIntegrations([ga4({ measurementId: "G-CLEAR", consentMode: "basic" })], host);
    await flush();
    fireLoad();
    await flush();
    writes.length = 0;
    set("analytics", false); // basic revoke → teardown
    const deleted = writes.filter((w) => w.includes("max-age=0")).map((w) => w.split("=")[0]);
    expect(deleted).toContain("_ga");
    expect(deleted).toContain("_ga_CLEAR"); // GA4's per-property cookie
    expect(deleted).not.toContain("_gcl_au"); // Ads' cookie must be left alone
  });

  it("basic teardown keeps the shared gtag.js while another gtag product is active", async () => {
    bootstrapGoogleConsentMode();
    const { host, set } = makeHost({ analytics: true, advertisement: true });
    runIntegrations(
      [ga4({ measurementId: "G-X", consentMode: "basic" }), googleAds({ conversionId: "AW-X" })],
      host,
    );
    await flush();
    fireLoad();
    await flush();
    document.cookie = "_gcl_au=ads.1.abc";
    set("analytics", false); // GA4 basic teardown, but Ads (advanced) is still active
    expect(el()).not.toBeNull(); // shared gtag.js stays
    expect(document.cookie).toContain("_gcl_au=ads.1.abc"); // Ads cookie untouched
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

  it("marks error when gtag.js fails to load, and removes it for retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    const runner = runIntegrations([ga4({ measurementId: "G-TEST" })], host);
    await flush();
    el()?.dispatchEvent(new Event("error")); // e.g. an ad blocker
    await flush();
    expect(runner.status().ga4).toBe("error"); // truthful, not "active"
    expect(el()).toBeNull();
  });

  it("allows an id override", () => {
    expect(ga4({ measurementId: "G-X" }).id).toBe("ga4");
    expect(ga4({ measurementId: "G-X", id: "g2" }).id).toBe("g2");
  });
});

describe("googleAds()", () => {
  it("shares gtag.js with GA4 (one library, both configs) — the multi-tracker case", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations(
      [ga4({ measurementId: "G-AAA" }), googleAds({ conversionId: "AW-BBB" })],
      host,
    );
    await flush();
    expect(document.querySelectorAll(`#${GTAG}`)).toHaveLength(1); // single shared gtag.js
    const configs = commands()
      .filter((c) => c[0] === "config")
      .map((c) => c[1]);
    expect(configs).toEqual(expect.arrayContaining(["G-AAA", "AW-BBB"]));
  });

  it("defaults to the advertisement category and id 'google-ads'", () => {
    const ads = googleAds({ conversionId: "AW-X" });
    expect(ads.id).toBe("google-ads");
    expect(ads.category).toBe("advertisement");
    expect(googleAds({ conversionId: "AW-X", id: "ads2" }).id).toBe("ads2");
  });

  it("auto-enables Restricted Data Processing for a CCPA visitor (explicit false wins)", async () => {
    bootstrapGoogleConsentMode();
    const a = makeHost({}, CCPA_REGION);
    runIntegrations([googleAds({ conversionId: "AW-R" })], a.host);
    await flush();
    expect(commands().some((c) => c[0] === "set" && c[1] === "restricted_data_processing" && c[2] === true)).toBe(true);

    win().dataLayer = undefined;
    win().gtag = undefined;
    win().__ckyGcmReady = undefined;
    document.head.innerHTML = "";
    bootstrapGoogleConsentMode();
    const b = makeHost({}, CCPA_REGION);
    runIntegrations([googleAds({ conversionId: "AW-R", restrictedDataProcessing: false })], b.host);
    await flush();
    expect(commands().some((c) => c[0] === "set" && c[1] === "restricted_data_processing")).toBe(false);
  });

  it("configures a given id only once, even if two integrations request it", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations(
      [ga4({ measurementId: "G-DUP" }), ga4({ measurementId: "G-DUP", id: "ga4b" })],
      host,
    );
    await flush();
    const configs = commands().filter((c) => c[0] === "config" && c[1] === "G-DUP");
    expect(configs).toHaveLength(1);
  });
});

describe("googleTagManager()", () => {
  const GTM = "cky-google-gtm";

  it("loads the container and pushes gtm.start", async () => {
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    const runner = runIntegrations([googleTagManager({ containerId: "GTM-XYZ" })], host);
    await flush();
    const gtm = document.getElementById(GTM) as HTMLScriptElement | null;
    expect(gtm?.src).toContain("gtm.js?id=GTM-XYZ");
    // gtm.start is pushed as a plain object (not a consent arguments array).
    const dl = win().dataLayer ?? [];
    expect(dl.some((c) => (c as unknown as { event?: string }).event === "gtm.js")).toBe(true);
    expect(runner.status().gtm).toBe("loading");
    gtm?.dispatchEvent(new Event("load"));
    await flush();
    expect(runner.status().gtm).toBe("active");
  });

  it("loads once and stays on revoke (keep); default id 'gtm'", async () => {
    bootstrapGoogleConsentMode();
    const { host, set } = makeHost({ analytics: true });
    runIntegrations([googleTagManager({ containerId: "GTM-XYZ" })], host);
    await flush();
    set("analytics", false);
    expect(document.querySelectorAll(`#${GTM}`)).toHaveLength(1);
    expect(document.getElementById(GTM)).not.toBeNull();
    expect(googleTagManager({ containerId: "GTM-X" }).id).toBe("gtm");
  });

  it("errors on container load failure, retries without pushing gtm.start twice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bootstrapGoogleConsentMode();
    const { host, set } = makeHost();
    const runner = runIntegrations([googleTagManager({ containerId: "GTM-R" })], host);
    await flush();
    document.getElementById(GTM)?.dispatchEvent(new Event("error"));
    await flush();
    expect(runner.status().gtm).toBe("error");
    set("analytics", true); // triggers a retry → re-injects the container
    await flush();
    expect(document.getElementById(GTM)).not.toBeNull();
    const starts = (win().dataLayer ?? []).filter(
      (c) => (c as unknown as { event?: string }).event === "gtm.js",
    );
    expect(starts).toHaveLength(1); // gtm.start pushed once, not per retry
  });
});

describe("Google container/tag overlap warning", () => {
  it("warns once when GTM and a gtag product (GA4/Ads) are both configured", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations([googleTagManager({ containerId: "GTM-X" }), ga4({ measurementId: "G-X" })], host);
    await flush();
    const overlap = spy.mock.calls.filter((c) => String(c[0]).includes("fire twice"));
    expect(overlap).toHaveLength(1);
  });

  it("does not warn for gtag products alone (no container)", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations([ga4({ measurementId: "G-X" }), googleAds({ conversionId: "AW-X" })], host);
    await flush();
    expect(spy.mock.calls.some((c) => String(c[0]).includes("fire twice"))).toBe(false);
  });

  it("warns even when the container is basic and never loads (config-time, not DOM)", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    bootstrapGoogleConsentMode();
    const { host } = makeHost();
    runIntegrations(
      [googleTagManager({ containerId: "GTM-X", consentMode: "basic" }), ga4({ measurementId: "G-X" })],
      host,
    );
    await flush();
    expect(spy.mock.calls.some((c) => String(c[0]).includes("fire twice"))).toBe(true);
  });
});
