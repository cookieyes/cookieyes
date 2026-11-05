import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { microsoftUet, uetEvent, uetPageLoad } from "../microsoft-uet.js";

const REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};
const CCPA: RegionDecision = { ...REGION, region: "US-CA", regulation: "CCPA" };

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

/** Stands in for the real tag: remembers its options and every push. */
class FakeUet {
  options: Record<string, unknown>;
  pushed: unknown[][] = [];
  uetConfig = { msDns: false };
  constructor(options: Record<string, unknown>) {
    this.options = options;
  }
  push(...args: unknown[]): void {
    this.pushed.push(args);
  }
}

type UetWindow = {
  uetq?: unknown[] | FakeUet | undefined;
  UET?: typeof FakeUet | undefined;
  __ckyUetSignal?: string | undefined;
};
const w = () => window as unknown as UetWindow;

const CONFIG = { tagId: "12345678" };
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-microsoft-uet") as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const queue = () => w().uetq as unknown[];
const tag = () => w().uetq as FakeUet;
const lastPush = () => tag().pushed[tag().pushed.length - 1];
const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter(Boolean);

beforeEach(() => {
  document.head.innerHTML = "";
  for (const name of cookieNames()) document.cookie = `${name}=; max-age=0; path=/`;
  localStorage.clear();
  w().uetq = undefined;
  w().UET = FakeUet;
  w().__ckyUetSignal = undefined;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("microsoftUet() in basic mode", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([microsoftUet(CONFIG)], host);
    await flush();
    expect(el()).toBeNull();
    expect(w().uetq).toBeUndefined();
    expect(cookieNames()).toEqual([]);
  });

  it("on grant pushes default granted, loads bat.js once and builds the tag (loading → active)", async () => {
    document.cookie = "_uetmsdns=1; path=/";
    const { host, set } = makeHost();
    const runner = runIntegrations([microsoftUet(CONFIG)], host);
    set("advertisement", true);
    await flush();
    expect(cookieNames()).not.toContain("_uetmsdns");
    expect(el()?.src).toBe("https://bat.bing.com/bat.js");
    expect(queue()).toEqual(["consent", "default", { ad_storage: "granted" }]);
    expect(runner.status()["microsoft-uet"]).toBe("loading");

    fireLoad();
    await flush();
    expect(runner.status()["microsoft-uet"]).toBe("active");
    expect(tag().options).toMatchObject({
      ti: "12345678",
      enableAutoSpaTracking: true,
      enableAutoConsent: false,
    });
    expect(tag().options.q).toEqual(["consent", "default", { ad_storage: "granted" }]);
    expect(tag().pushed).toEqual([["pageLoad"]]);
    expect(document.querySelectorAll("#cky-microsoft-uet")).toHaveLength(1);
  });

  it("on withdrawal signals denied, silences the tag, sets _uetmsdns and clears UET's cookies and storage", async () => {
    const { host, set } = makeHost({ advertisement: true });
    const runner = runIntegrations([microsoftUet(CONFIG)], host);
    await flush();
    fireLoad();
    await flush();
    document.cookie = "_uetsid=s; path=/";
    document.cookie = "_uetvid=v; path=/";
    document.cookie = "_uetmsclkid=c; path=/";
    for (const key of ["_uetsid", "_uetsid_exp", "_uetvid", "_uetvid_exp", "_uetmsclkid"]) {
      localStorage.setItem(key, "x");
    }
    localStorage.setItem("keep", "x");

    set("advertisement", false);
    expect(runner.status()["microsoft-uet"]).toBe("silenced");
    expect(lastPush()).toEqual(["consent", "update", { ad_storage: "denied" }]);
    expect(tag().uetConfig.msDns).toBe(true);
    expect(cookieNames()).toEqual(["_uetmsdns"]);
    expect(Object.keys(localStorage)).toEqual(["keep"]);
  });

  it("on re-grant lifts the switch and signals granted on the same tag, with no second script", async () => {
    const { host, set } = makeHost({ advertisement: true });
    const runner = runIntegrations([microsoftUet(CONFIG)], host);
    await flush();
    fireLoad();
    await flush();
    set("advertisement", false);
    set("advertisement", true);
    expect(runner.status()["microsoft-uet"]).toBe("active");
    expect(lastPush()).toEqual(["consent", "update", { ad_storage: "granted" }]);
    expect(tag().uetConfig.msDns).toBe(false);
    expect(cookieNames()).not.toContain("_uetmsdns");
    expect(document.querySelectorAll("#cky-microsoft-uet")).toHaveLength(1);
    expect(tag().pushed.filter((p) => p[0] === "pageLoad")).toHaveLength(1);
  });

  it("trims the tag id and honours autoSpaTracking, category and id", async () => {
    const { host, set } = makeHost();
    runIntegrations(
      [microsoftUet({ tagId: " 12345678 ", autoSpaTracking: false, category: "marketing" })],
      host,
    );
    set("advertisement", true);
    await flush();
    expect(el()).toBeNull();
    set("marketing", true);
    await flush();
    fireLoad();
    await flush();
    expect(tag().options).toMatchObject({ ti: "12345678", enableAutoSpaTracking: false });

    expect(microsoftUet(CONFIG).id).toBe("microsoft-uet");
    expect(microsoftUet({ ...CONFIG, id: "uet2" }).id).toBe("uet2");
  });

  it("logs one error and loads nothing for an empty tag id", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { host } = makeHost({ advertisement: true });
    runIntegrations([microsoftUet({ tagId: "  " })], host);
    await flush();
    expect(el()).toBeNull();
    expect(w().uetq).toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("marks error on load failure, drops the queue and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([microsoftUet(CONFIG)], host);
    set("advertisement", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status()["microsoft-uet"]).toBe("error");
    expect(el()).toBeNull();
    expect(w().uetq).toBeUndefined();

    set("advertisement", false);
    set("advertisement", true);
    await flush();
    expect(el()).not.toBeNull();
    expect(queue()).toEqual(["consent", "default", { ad_storage: "granted" }]);
  });

  it("tells a tag that is already on the page where consent stands after a restart", async () => {
    const pre = document.createElement("script");
    pre.id = "cky-microsoft-uet";
    pre.dataset.ckyLoaded = "true";
    document.head.appendChild(pre);
    const fake = new FakeUet({});
    w().uetq = fake;
    w().__ckyUetSignal = "denied";

    const { host, set } = makeHost();
    const runner = runIntegrations([microsoftUet(CONFIG)], host);
    set("advertisement", true);
    await flush();
    expect(runner.status()["microsoft-uet"]).toBe("active");
    expect(fake.pushed).toEqual([["consent", "update", { ad_storage: "granted" }]]);
    expect(document.querySelectorAll("#cky-microsoft-uet")).toHaveLength(1);
  });

  it("resolves setup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const ctx = { granted: () => true, onConsentChange: () => () => {}, region: REGION };
      const control = (await microsoftUet(CONFIG).setup(ctx)) as {
        silence: () => void;
        resume: () => void;
      };
      expect(() => control.silence()).not.toThrow();
      expect(() => control.resume()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("microsoftUet() in advanced mode", () => {
  const ADVANCED = { ...CONFIG, consentMode: "advanced" as const };

  it("loads at once with default denied and notes it in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([microsoftUet(ADVANCED)], host);
    await flush();
    expect(el()).not.toBeNull();
    expect(queue()).toEqual(["consent", "default", { ad_storage: "denied" }]);
    expect(cookieNames()).toEqual([]);
    expect(info).toHaveBeenCalledTimes(1);

    fireLoad();
    await flush();
    expect(runner.status()["microsoft-uet"]).toBe("silenced");
    // The engine silences it right after setup; the default already said denied.
    expect(tag().pushed).toEqual([["pageLoad"]]);
    expect(tag().uetConfig.msDns).toBe(false);

    set("advertisement", true);
    expect(runner.status()["microsoft-uet"]).toBe("active");
    expect(lastPush()).toEqual(["consent", "update", { ad_storage: "granted" }]);
  });

  it("on withdrawal signals denied and clears the cookies, but keeps the tag sending", async () => {
    const { host, set } = makeHost({ advertisement: true });
    const runner = runIntegrations([microsoftUet(ADVANCED)], host);
    await flush();
    expect(queue()).toEqual(["consent", "default", { ad_storage: "granted" }]);
    fireLoad();
    await flush();
    document.cookie = "_uetvid=v; path=/";
    localStorage.setItem("_uetvid_exp", "x");

    set("advertisement", false);
    expect(runner.status()["microsoft-uet"]).toBe("silenced");
    expect(lastPush()).toEqual(["consent", "update", { ad_storage: "denied" }]);
    expect(tag().uetConfig.msDns).toBe(false);
    expect(cookieNames()).toEqual([]);
    expect(Object.keys(localStorage)).toEqual([]);
    expect(el()).not.toBeNull();
  });

  it("sets _uetmsdns before the tag starts for a US opt-out visitor, and lifts it on opt-in", async () => {
    const { host, set } = makeHost({}, CCPA);
    runIntegrations([microsoftUet(ADVANCED)], host);
    await flush();
    expect(cookieNames()).toEqual(["_uetmsdns"]);
    fireLoad();
    await flush();
    expect(tag().uetConfig.msDns).toBe(true);

    set("advertisement", true);
    expect(cookieNames()).toEqual([]);
    expect(tag().uetConfig.msDns).toBe(false);
    expect(lastPush()).toEqual(["consent", "update", { ad_storage: "granted" }]);

    set("advertisement", false);
    expect(cookieNames()).toEqual(["_uetmsdns"]);
    expect(tag().uetConfig.msDns).toBe(true);
  });

  it("lets restrictDataSharing force the switch on or off", async () => {
    const off = makeHost({}, CCPA);
    runIntegrations([microsoftUet({ ...ADVANCED, restrictDataSharing: false })], off.host);
    await flush();
    expect(cookieNames()).toEqual([]);

    document.head.innerHTML = "";
    w().uetq = undefined;
    const on = makeHost();
    runIntegrations([microsoftUet({ ...ADVANCED, restrictDataSharing: true })], on.host);
    await flush();
    expect(cookieNames()).toEqual(["_uetmsdns"]);
  });
});

describe("uetEvent() and uetPageLoad()", () => {
  it("do nothing before UET is on the page, with one warning in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    uetEvent("purchase", { revenue_value: 49, currency: "EUR" });
    uetPageLoad();
    expect(w().uetq).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("push UET's commands to the queue or the tag", () => {
    w().uetq = [];
    uetEvent("purchase", { revenue_value: 49, currency: "EUR" });
    expect(queue()).toEqual(["event", "purchase", { revenue_value: 49, currency: "EUR" }]);

    const fake = new FakeUet({});
    w().uetq = fake;
    uetEvent("signup");
    uetPageLoad();
    expect(fake.pushed).toEqual([["event", "signup", {}], ["pageLoad"]]);
  });
});
