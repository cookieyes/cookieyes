import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _createRuntime, getCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("_createRuntime", () => {
  it("throws when self-hosted mode has neither backend nor apiUrl", () => {
    expect(() => _createRuntime({ mode: "self-hosted" })).toThrow(
      /requires either backend or apiUrl/,
    );
  });

  it("mounts self-hosted when an apiUrl is supplied", () => {
    expect(() =>
      _createRuntime({ mode: "self-hosted", apiUrl: "https://example.com/consent" }),
    ).not.toThrow();
  });

  it("sets window.CookieYesSDK, so Svelte setups are counted like core ones", () => {
    delete (window as Window & { CookieYesSDK?: unknown }).CookieYesSDK;
    _createRuntime(cookieOnly("DEFAULT"));
    expect((window as Window & { CookieYesSDK?: unknown }).CookieYesSDK).toEqual({
      version: expect.any(String),
    });
  });

  it("replaces the previous runtime and registers the new one", () => {
    const first = _createRuntime(cookieOnly("GDPR"));
    const second = _createRuntime(cookieOnly("CCPA"));
    expect(getCookieYes()).toBe(second);
    expect(second.getSnapshot().regulation).toBe("CCPA");
    expect(first).not.toBe(second);
  });

  it("threads theme and colour scheme through to the runtime", () => {
    const rt = _createRuntime({
      mode: "cookie-only",
      colorScheme: "dark",
      theme: { primaryColor: "#123456" },
    });
    expect(rt.theme).toEqual({ primaryColor: "#123456" });
    expect(rt.colorScheme).toBe("dark");
    expect(_createRuntime(cookieOnly()).colorScheme).toBe("system");
  });
});

describe("getCookieYes() / resetCookieYes()", () => {
  it("throws before any runtime is created", () => {
    expect(() => getCookieYes()).toThrow(/found no runtime/);
  });

  it("resetCookieYes() clears the registered runtime", () => {
    _createRuntime(cookieOnly());
    resetCookieYes();
    expect(() => getCookieYes()).toThrow(/found no runtime/);
  });
});

describe("runtime snapshot and actions", () => {
  it("defaults to necessary-only with hasActed=false", () => {
    const snap = _createRuntime(cookieOnly("GDPR")).getSnapshot();
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
    const rt = _createRuntime(cookieOnly());
    rt.manager.acceptAll();
    const snap = rt.getSnapshot();
    expect(snap.hasActed).toBe(true);
    expect(Object.values(snap.categories).every(Boolean)).toBe(true);
  });

  it("rejectAll() keeps only the necessary category", () => {
    const rt = _createRuntime(cookieOnly());
    rt.manager.rejectAll();
    expect(rt.getSnapshot().categories).toMatchObject({ necessary: true, analytics: false });
    expect(rt.getSnapshot().hasActed).toBe(true);
  });

  it("showOptOut()/hideOptOut() toggle the flag and notify subscribers", () => {
    const rt = _createRuntime(cookieOnly("CCPA"));
    let notified = 0;
    rt.subscribe(() => {
      notified += 1;
    });
    rt.showOptOut();
    expect(rt.getSnapshot().isOptOutOpen).toBe(true);
    rt.hideOptOut();
    expect(rt.getSnapshot().isOptOutOpen).toBe(false);
    expect(notified).toBe(2);
  });

  it("showOptOut/hideOptOut are idempotent", () => {
    const rt = _createRuntime(cookieOnly("CCPA"));
    let notified = 0;
    rt.subscribe(() => {
      notified += 1;
    });
    rt.hideOptOut();
    rt.showOptOut();
    rt.showOptOut();
    expect(notified).toBe(1);
  });

  it("stops notifying after unsubscribe", () => {
    const rt = _createRuntime(cookieOnly());
    let fired = 0;
    const unsub = rt.subscribe(() => {
      fired += 1;
    });
    rt.manager.acceptAll();
    expect(fired).toBeGreaterThanOrEqual(1);
    unsub();
    const seen = fired;
    rt.manager.rejectAll();
    expect(fired).toBe(seen);
  });
});

describe("getServerSnapshot()", () => {
  const taxonomy = [
    { id: "essential", required: true, label: "Essential", description: "" },
    { id: "stats", label: "Stats", description: "" },
  ];

  function stripLive(
    snap: ReturnType<typeof getCookieYes>["getSnapshot"] extends () => infer S ? S : never,
  ) {
    return { regulation: snap.regulation, categories: snap.categories, hasActed: snap.hasActed };
  }

  it("is frozen", () => {
    const ssr = _createRuntime(cookieOnly()).getServerSnapshot();
    expect(Object.isFrozen(ssr)).toBe(true);
    expect(Object.isFrozen(ssr.categories)).toBe(true);
  });

  it.each(["GDPR", "CCPA"] as const)("equals a fresh client snapshot under %s", (regulation) => {
    const rt = _createRuntime(cookieOnly(regulation));
    expect(stripLive(rt.getServerSnapshot())).toEqual(stripLive(rt.getSnapshot()));
  });

  it("equals a fresh client snapshot for a custom taxonomy", () => {
    const rt = _createRuntime({ mode: "cookie-only", regulation: "GDPR", categories: taxonomy });
    expect(rt.getServerSnapshot().categories).toEqual({ essential: true, stats: false });
    expect(stripLive(rt.getServerSnapshot())).toEqual(stripLive(rt.getSnapshot()));
  });

  it("turns every category on for CCPA, which is opt-out", () => {
    const ssr = _createRuntime(cookieOnly("CCPA")).getServerSnapshot();
    expect(Object.values(ssr.categories).every(Boolean)).toBe(true);
  });
});

describe("dev forceRegion override", () => {
  const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

  afterEach(() => {
    document.cookie = "__cyd_region=; max-age=0; path=/";
  });

  it("keeps the override out of the server snapshot so hydration matches", () => {
    document.cookie = "__cyd_region=US-CA; path=/";
    const rt = _createRuntime({
      mode: "cookie-only",
      region: { detect: () => "DE", map },
    });
    expect(rt.getServerSnapshot().regulation).toBe("GDPR");
    expect(rt.getSnapshot().regulation).toBe("CCPA");
    expect(rt.getRegion()).toMatchObject({ source: "forced", regulation: "CCPA" });
  });

  it("pushes the region config onto the devtools queue", () => {
    const g = globalThis as typeof globalThis & { __COOKIEYES_DEVTOOLS__?: { k: string }[] };
    delete g.__COOKIEYES_DEVTOOLS__;
    _createRuntime({ mode: "cookie-only", regulation: "GDPR" });
    const queue: { k: string }[] = g.__COOKIEYES_DEVTOOLS__ ?? [];
    expect(queue.some((e) => e.k === "r")).toBe(true);
  });
});
