import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

type HotjarFn = ((...a: unknown[]) => void) & { q?: unknown[][] };
type HotjarWindow = {
  hj?: HotjarFn | undefined;
  _hjSettings?: { hjid: number; hjsv: number } | undefined;
};
const w = window as unknown as HotjarWindow;

const SITE = 1234567;
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-hotjar") as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const queued = () => w.hj?.q ?? [];

// Module state (consent flag, one-time warning) is per page, so each test gets a fresh module.
let mod: typeof import("../hotjar.js");

beforeEach(async () => {
  vi.resetModules();
  mod = await import("../hotjar.js");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  w.hj = undefined;
  w._hjSettings = undefined;
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function loaded(config: Partial<Parameters<typeof mod.hotjar>[0]> = {}) {
  const ctl = makeHost({ analytics: true });
  const runner = runIntegrations([mod.hotjar({ siteId: SITE, ...config })], ctl.host);
  await flush();
  fireLoad();
  await flush();
  return { ...ctl, runner };
}

describe("hotjar()", () => {
  it("loads nothing and creates no queue before consent", async () => {
    const { host } = makeHost();
    runIntegrations([mod.hotjar({ siteId: SITE })], host);
    await flush();
    expect(el()).toBeNull();
    expect(w.hj).toBeUndefined();
    expect(w._hjSettings).toBeUndefined();
  });

  it("injects Hotjar's snippet on grant (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([mod.hotjar({ siteId: SITE })], host);
    set("analytics", true);
    await flush();
    expect(el()?.src).toBe(`https://static.hotjar.com/c/hotjar-${SITE}.js?sv=6`);
    expect(w._hjSettings).toEqual({ hjid: SITE, hjsv: 6 });
    expect(typeof w.hj).toBe("function");
    expect(runner.status().hotjar).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().hotjar).toBe("active");
  });

  it("uses a custom script URL and snippet version", async () => {
    await loaded({ scriptUrl: "https://example.com/hj.js", snippetVersion: 7 });
    expect(el()?.src).toBe("https://example.com/hj.js");
    expect(w._hjSettings).toEqual({ hjid: SITE, hjsv: 7 });
  });

  it("deletes Hotjar's cookies, storage and page elements on withdrawal", async () => {
    const { set, runner } = await loaded();
    document.cookie = `_hjSession_${SITE}=1; path=/`;
    document.cookie = `_hjSessionUser_${SITE}=1; path=/`;
    document.cookie = "site_pref=1; path=/";
    localStorage.setItem("_hjUserAttributes", "x");
    localStorage.setItem("hjActiveViewportIds", "x");
    localStorage.setItem("hjkeep", "x");
    sessionStorage.setItem("hjViewportId", "x");
    document.head.insertAdjacentHTML(
      "beforeend",
      '<script src="https://script.hotjar.com/modules.abc.js"></script>',
    );
    document.body.insertAdjacentHTML(
      "beforeend",
      '<iframe id="_hjSafeContext_1"></iframe><div class="_hj-widget-container"></div>' +
        '<div class="survey _hj-survey-embed-container"></div><p id="keep" class="card_hj"></p>',
    );

    set("analytics", false);

    expect(runner.status().hotjar).toBe("removed");
    expect(document.cookie).not.toContain("_hj");
    expect(document.cookie).toContain("site_pref=1");
    expect(localStorage.getItem("_hjUserAttributes")).toBeNull();
    expect(localStorage.getItem("hjActiveViewportIds")).toBeNull();
    expect(localStorage.getItem("hjkeep")).toBe("x");
    expect(sessionStorage.getItem("hjViewportId")).toBeNull();
    expect(document.querySelector('[src*="hotjar"], [id^="_hj"], [class*="_hj-"]')).toBeNull();
    expect(document.getElementById("keep")).not.toBeNull();
    expect(typeof w.hj).toBe("function"); // deleting it makes Hotjar throw on every tick
  });

  it("does not load a second copy when consent is granted again on the same page", async () => {
    const { set, runner } = await loaded();
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).toBeNull();
    expect(runner.status().hotjar).toBe("active");
  });

  it("marks error on load failure, undoes the snippet, and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([mod.hotjar({ siteId: SITE })], host);
    set("analytics", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().hotjar).toBe("error");
    expect(el()).toBeNull();
    expect(w.hj).toBeUndefined();
    expect(w._hjSettings).toBeUndefined();
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("honours a custom category and id", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations(
      [mod.hotjar({ siteId: SITE, category: "recording", id: "hj2" })],
      host,
    );
    set("analytics", true);
    await flush();
    expect(el()).toBeNull();
    set("recording", true);
    await flush();
    expect(runner.status().hj2).toBe("loading");
  });
});

describe("hotjar() reloadOnRevoke", () => {
  let reload: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    reload = vi.fn();
    originalLocation = window.location;
    // jsdom's location.reload is non-configurable, so replace the whole object.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: unknown }).location = { ...originalLocation, reload };
  });
  afterEach(() => {
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it("reloads on withdrawal when enabled", async () => {
    const { set } = await loaded({ reloadOnRevoke: true });
    set("analytics", false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload by default", async () => {
    const { set } = await loaded();
    set("analytics", false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload when the SDK is torn down with consent still granted", async () => {
    const { runner } = await loaded({ reloadOnRevoke: true });
    runner.stop();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("hotjarEvent() / hotjarIdentify() / hotjarStateChange()", () => {
  it("drop calls before consent without throwing, warning once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mod.hotjarEvent("signup");
    mod.hotjarIdentify("user_1", { plan: "pro" });
    mod.hotjarStateChange("/next");
    expect(w.hj).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("never sends calls made before consent once consent is granted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mod.hotjarEvent("before_consent");
    await loaded();
    expect(queued()).toEqual([]);
  });

  it("queue calls while Hotjar loads, so nothing is lost after consent", async () => {
    const { host, set } = makeHost();
    runIntegrations([mod.hotjar({ siteId: SITE })], host);
    set("analytics", true);
    await flush();
    mod.hotjarEvent("signup");
    mod.hotjarIdentify("user_1", { plan: "pro" });
    mod.hotjarIdentify(null);
    mod.hotjarStateChange("/next");
    expect(queued()).toEqual([
      ["event", "signup"],
      ["identify", "user_1", { plan: "pro" }],
      ["identify", null],
      ["stateChange", "/next"],
    ]);
  });

  it("drop calls after withdrawal, and send again after a new grant", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { set } = await loaded();
    set("analytics", false);
    mod.hotjarEvent("after_withdraw");
    expect(queued()).toEqual([]);
    set("analytics", true);
    await flush();
    mod.hotjarEvent("regranted");
    expect(queued()).toEqual([["event", "regranted"]]);
  });
});

describe("hotjar() during SSR", () => {
  it("resolves setup and cleanup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const integration = mod.hotjar({ siteId: SITE });
      const ctx = { granted: () => false, onConsentChange: () => () => {}, region: REGION };
      const cleanup = await integration.setup(ctx);
      expect(() => (cleanup as () => void)()).not.toThrow();
      expect(() => mod.hotjarEvent("x")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
