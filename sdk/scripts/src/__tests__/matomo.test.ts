import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matomoAnalytics, matomoEvent, matomoPageView } from "../matomo.js";

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

const MATOMO_URL = "https://example.matomo.cloud";
const CONFIG = { matomoUrl: MATOMO_URL, siteId: 1 };
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-matomo") as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));

type WindowWithPaq = { _paq?: unknown[][] | undefined };
const paq = () => (window as unknown as WindowWithPaq)._paq;
/** The command names pushed so far, in order. */
const commands = () => (paq() ?? []).map((c) => c[0]);
const lastCommands = (n: number) => commands().slice(-n);

beforeEach(() => {
  document.head.innerHTML = "";
  (window as unknown as WindowWithPaq)._paq = undefined;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("matomoAnalytics()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([matomoAnalytics(CONFIG)], host);
    await flush();
    expect(el()).toBeNull();
    expect(paq()).toBeUndefined();
  });

  it("injects the tracker with the standard commands on grant (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([matomoAnalytics(CONFIG)], host);
    set("analytics", true);
    await flush();
    expect(el()?.src).toBe(`${MATOMO_URL}/matomo.js`);
    expect(paq()).toEqual([
      ["setTrackerUrl", `${MATOMO_URL}/matomo.php`],
      ["setSiteId", 1],
      ["enableLinkTracking"],
      ["trackPageView"],
    ]);
    expect(runner.status().matomo).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().matomo).toBe("active");
  });

  it("stops and deletes cookies on revoke, then resumes with a fresh page view", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([matomoAnalytics(CONFIG)], host);
    await flush();
    fireLoad();
    await flush();

    set("analytics", false);
    expect(runner.status().matomo).toBe("silenced");
    expect(lastCommands(2)).toEqual(["requireConsent", "deleteCookies"]);

    set("analytics", true);
    expect(runner.status().matomo).toBe("active");
    expect(lastCommands(2)).toEqual(["trackPageView", "setConsentGiven"]);
    expect(document.querySelectorAll("#cky-matomo")).toHaveLength(1);
  });

  it("clears Matomo's own consent cookies before the tracker loads", async () => {
    document.cookie = "mtm_consent=1; path=/";
    document.cookie = "mtm_consent_removed=1; path=/";
    document.cookie = "mtm_cookie_consent=1; path=/";
    const { host, set } = makeHost();
    runIntegrations([matomoAnalytics(CONFIG)], host);
    set("analytics", true);
    await flush();
    expect(document.cookie).not.toContain("mtm_");
  });

  it("cookieless-first loads at once without cookies and only toggles cookies with consent", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations(
      [matomoAnalytics({ ...CONFIG, consentMode: "cookieless-first" })],
      host,
    );
    await flush();
    expect(el()).not.toBeNull();
    expect(commands()[0]).toBe("requireCookieConsent");
    fireLoad();
    await flush();
    expect(runner.status().matomo).toBe("silenced");
    expect(lastCommands(1)).toEqual(["forgetCookieConsentGiven"]);

    set("analytics", true);
    expect(runner.status().matomo).toBe("active");
    expect(lastCommands(1)).toEqual(["setCookieConsentGiven"]);

    set("analytics", false);
    expect(runner.status().matomo).toBe("silenced");
    expect(lastCommands(1)).toEqual(["forgetCookieConsentGiven"]);
  });

  it("cookieless-first skips requireCookieConsent when consent is already granted", async () => {
    const { host } = makeHost({ analytics: true });
    runIntegrations([matomoAnalytics({ ...CONFIG, consentMode: "cookieless-first" })], host);
    await flush();
    expect(commands()).not.toContain("requireCookieConsent");
    expect(commands()[0]).toBe("setTrackerUrl");
  });

  it("trims a trailing slash and honours custom script and tracker URLs", async () => {
    const { host } = makeHost({ analytics: true });
    runIntegrations(
      [matomoAnalytics({ matomoUrl: "https://stats.example.com/", siteId: 7 })],
      host,
    );
    await flush();
    expect(el()?.src).toBe("https://stats.example.com/matomo.js");
    expect(paq()?.[0]).toEqual(["setTrackerUrl", "https://stats.example.com/matomo.php"]);

    document.head.innerHTML = "";
    (window as unknown as WindowWithPaq)._paq = undefined;
    runIntegrations(
      [
        matomoAnalytics({
          ...CONFIG,
          scriptUrl: "https://stats.example.com/js/",
          trackerUrl: "https://stats.example.com/js/",
        }),
      ],
      host,
    );
    await flush();
    expect(el()?.src).toBe("https://stats.example.com/js/");
    expect(paq()?.[0]).toEqual(["setTrackerUrl", "https://stats.example.com/js/"]);
  });

  it("marks error on load failure, drops its commands and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([matomoAnalytics(CONFIG)], host);
    set("analytics", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().matomo).toBe("error");
    expect(el()).toBeNull();
    expect(paq()).toEqual([]);

    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull();
    expect(commands()).toEqual([
      "setTrackerUrl",
      "setSiteId",
      "enableLinkTracking",
      "trackPageView",
    ]);
  });

  it("resumes a tracker that is already on the page after a restart", async () => {
    const pre = document.createElement("script");
    pre.id = "cky-matomo";
    pre.dataset.ckyLoaded = "true";
    document.head.appendChild(pre);
    (window as unknown as WindowWithPaq)._paq = [];

    const { host, set } = makeHost();
    const runner = runIntegrations([matomoAnalytics(CONFIG)], host);
    set("analytics", true);
    await flush();
    expect(runner.status().matomo).toBe("active");
    expect(commands()).toEqual(["trackPageView", "setConsentGiven"]);
    expect(document.querySelectorAll("#cky-matomo")).toHaveLength(1);
  });

  it("honours a custom category and an id override", async () => {
    const { host, set } = makeHost();
    runIntegrations([matomoAnalytics({ ...CONFIG, category: "statistics" })], host);
    set("analytics", true);
    await flush();
    expect(el()).toBeNull();
    set("statistics", true);
    await flush();
    expect(el()).not.toBeNull();

    expect(matomoAnalytics(CONFIG).id).toBe("matomo");
    expect(matomoAnalytics({ ...CONFIG, id: "matomo2" }).id).toBe("matomo2");
  });

  it("resolves setup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const ctx = { granted: () => true, onConsentChange: () => () => {}, region: REGION };
      const control = (await matomoAnalytics(CONFIG).setup(ctx)) as {
        silence: () => void;
        resume: () => void;
      };
      expect(() => control.silence()).not.toThrow();
      expect(() => control.resume()).not.toThrow();
      expect(() => matomoPageView()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("matomoEvent() and matomoPageView()", () => {
  it("do nothing before Matomo is loaded", () => {
    expect(() => matomoEvent("signup", "completed")).not.toThrow();
    expect(() => matomoPageView()).not.toThrow();
    expect(paq()).toBeUndefined();
  });

  it("push Matomo's commands once _paq exists", () => {
    (window as unknown as WindowWithPaq)._paq = [];
    matomoEvent("signup", "completed", "pro", 5);
    matomoPageView();
    matomoPageView("/pricing", "Pricing");
    expect(paq()).toEqual([
      ["trackEvent", "signup", "completed", "pro", 5],
      ["setCustomUrl", window.location.href],
      ["setDocumentTitle", document.title],
      ["trackPageView"],
      ["setCustomUrl", "/pricing"],
      ["setDocumentTitle", "Pricing"],
      ["trackPageView"],
    ]);
  });
});
