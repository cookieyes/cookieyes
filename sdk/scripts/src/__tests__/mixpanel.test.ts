import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MixpanelConfig,
  mixpanel,
  mixpanelIdentify,
  mixpanelPeopleSet,
  mixpanelRegister,
  mixpanelReset,
  mixpanelSync,
  mixpanelTrack,
} from "../mixpanel.js";

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

const TOKEN = "0123456789abcdef0123456789abcdef";
const CONFIG = { token: TOKEN };
const LIB = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
const US = "https://api-js.mixpanel.com";

/** The queue Mixpanel's snippet builds: calls as `[method, ...args]`, inits in `_i`. */
type Stub = unknown[][] & { _i?: unknown[]; people?: unknown[][] };

/** Stands in for the loaded library: remembers every call and its opt-in state. */
class FakeMixpanel {
  calls: unknown[][] = [];
  optedIn = false;
  inits: unknown[];
  people = { set: (props: unknown) => this.calls.push(["people.set", props]) };
  constructor(stub: Stub | undefined) {
    this.inits = stub?._i ?? [];
  }
  track(...args: unknown[]) {
    this.calls.push(["track", ...args]);
  }
  identify(...args: unknown[]) {
    this.calls.push(["identify", ...args]);
  }
  register(...args: unknown[]) {
    this.calls.push(["register", ...args]);
  }
  reset() {
    this.calls.push(["reset"]);
  }
  opt_in_tracking() {
    this.optedIn = true;
    this.calls.push(["opt_in_tracking"]);
  }
  opt_out_tracking(options: unknown) {
    this.optedIn = false;
    this.calls.push(["opt_out_tracking", options]);
  }
  has_opted_in_tracking() {
    return this.optedIn;
  }
  stop_batch_senders() {
    this.calls.push(["stop_batch_senders"]);
  }
  get_config(key: string) {
    return key === "token" ? TOKEN : undefined;
  }
}

type MpWindow = { mixpanel?: Stub | FakeMixpanel | undefined };
const w = () => window as unknown as MpWindow;
const stub = () => w().mixpanel as Stub;
/** The config passed to Mixpanel's `init` by the queue. */
const initConfigOf = () => ((stub()._i ?? [])[0] as unknown[])[1];
const flush = () => new Promise((r) => setTimeout(r, 0));
const el = () => document.getElementById("cky-mixpanel") as HTMLScriptElement | null;
const fireError = () => el()?.dispatchEvent(new Event("error"));
/** What the library does when it loads: replaces the queue with the instance, keeping the inits. */
function fireLoad(optedIn = false): FakeMixpanel {
  const fake = new FakeMixpanel(stub());
  fake.optedIn = optedIn;
  w().mixpanel = fake;
  el()?.dispatchEvent(new Event("load"));
  return fake;
}
const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter(Boolean);

/** Grant, load the script and settle the engine: Mixpanel is active. */
async function loaded(config: MixpanelConfig = CONFIG, optedIn = false) {
  const made = makeHost({ analytics: true });
  const runner = runIntegrations([mixpanel(config)], made.host);
  await flush();
  const fake = fireLoad(optedIn);
  await flush();
  return { ...made, runner, fake };
}

/** The leftovers Mixpanel keeps after its own opt-out, plus unrelated entries that must survive. */
function leaveLeftovers() {
  for (const name of [`mp_${TOKEN}_mixpanel`, "mp_optout", "keep"]) {
    document.cookie = `${name}=x; path=/`;
  }
  for (const key of [
    `mp_${TOKEN}_mixpanel`,
    `__mpq_${TOKEN}_ev`,
    `__mpq_${TOKEN}_pp`,
    `__mpq_${TOKEN}_gr`,
  ]) {
    localStorage.setItem(key, "x");
  }
  localStorage.setItem(`__mp_opt_in_out_${TOKEN}`, "0");
  localStorage.setItem("keep", "x");
  sessionStorage.setItem(`mp_tab_id_mixpanel_${TOKEN}`, "x");
  sessionStorage.setItem(`mp_gen_new_tab_id_mixpanel_${TOKEN}`, "x");
  sessionStorage.setItem("keep", "x");
}

let deleteDatabase: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.head.innerHTML = "";
  for (const name of cookieNames()) document.cookie = `${name}=; max-age=0; path=/`;
  localStorage.clear();
  sessionStorage.clear();
  w().mixpanel = undefined;
  deleteDatabase = vi.fn();
  vi.stubGlobal("indexedDB", { deleteDatabase });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mixpanel() in stop mode", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([mixpanel(CONFIG)], host);
    await flush();
    expect(el()).toBeNull();
    expect(w().mixpanel).toBeUndefined();
  });

  it("on grant clears a stale opt-out marker, builds the queue, inits once and loads the library (loading → active)", async () => {
    localStorage.setItem(`__mp_opt_in_out_${TOKEN}`, "0");
    document.cookie = `__mp_opt_in_out_${TOKEN}=0; path=/`;
    const { host, set } = makeHost();
    const runner = runIntegrations([mixpanel(CONFIG)], host);
    set("analytics", true);
    await flush();
    expect(localStorage.getItem(`__mp_opt_in_out_${TOKEN}`)).toBeNull();
    expect(cookieNames()).toEqual([]);
    expect(stub()._i).toEqual([
      [TOKEN, { api_host: US, track_pageview: "url-with-path" }, "mixpanel"],
    ]);
    expect(el()?.src).toBe(LIB);
    expect(runner.status().mixpanel).toBe("loading");

    const fake = fireLoad();
    await flush();
    expect(runner.status().mixpanel).toBe("active");
    expect(fake.calls).toEqual([]);
    expect(document.querySelectorAll("#cky-mixpanel")).toHaveLength(1);
  });

  it("on withdrawal stops batching, opts out with the profile deletion, and clears what Mixpanel leaves behind", async () => {
    const { runner, fake, set } = await loaded();
    leaveLeftovers();

    set("analytics", false);
    expect(runner.status().mixpanel).toBe("silenced");
    expect(fake.calls).toEqual([
      ["stop_batch_senders"],
      ["opt_out_tracking", { delete_user: true }],
    ]);
    expect(cookieNames()).toEqual(["keep"]);
    expect(Object.keys(localStorage).sort()).toEqual([`__mp_opt_in_out_${TOKEN}`, "keep"]);
    expect(Object.keys(sessionStorage)).toEqual(["keep"]);
    expect(deleteDatabase).toHaveBeenCalledWith("mixpanelBrowserDb");
    expect(el()).not.toBeNull();
  });

  it("keeps the profile when deleteProfileOnWithdraw is false", async () => {
    const { fake, set } = await loaded({ ...CONFIG, deleteProfileOnWithdraw: false });
    set("analytics", false);
    expect(fake.calls).toEqual([
      ["stop_batch_senders"],
      ["opt_out_tracking", { delete_user: false }],
    ]);
  });

  it("on re-grant resets to a fresh identity and opts in on the same library, with no second script", async () => {
    const { runner, fake, set } = await loaded();
    set("analytics", false);
    fake.calls = [];
    set("analytics", true);
    await flush();
    expect(runner.status().mixpanel).toBe("active");
    expect(fake.calls).toEqual([["reset"], ["opt_in_tracking"]]);
    expect(document.querySelectorAll("#cky-mixpanel")).toHaveLength(1);
  });

  it("trims the token and honours region, apiHost, trackPageViews, initOptions, category and id", async () => {
    const { host } = makeHost({ product: true });
    const runner = runIntegrations(
      [
        mixpanel({
          token: `  ${TOKEN}  `,
          region: "eu",
          trackPageViews: false,
          initOptions: { ignore_dnt: true, cookie_expiration: 90 },
          category: "product",
          id: "mp-2",
        }),
      ],
      host,
    );
    await flush();
    expect(runner.status()["mp-2"]).toBe("loading");
    expect(stub()._i).toEqual([
      [
        TOKEN,
        {
          api_host: "https://api-eu.mixpanel.com",
          track_pageview: false,
          ignore_dnt: true,
          cookie_expiration: 90,
        },
        "mixpanel",
      ],
    ]);

    w().mixpanel = undefined;
    document.head.innerHTML = "";
    runIntegrations(
      [mixpanel({ ...CONFIG, region: "in", apiHost: "https://mp.example.com" })],
      makeHost({ analytics: true }).host,
    );
    await flush();
    expect(initConfigOf()).toMatchObject({ api_host: "https://mp.example.com" });
  });

  it("logs one error and loads nothing for a token that is not 32 hexadecimal characters", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { host } = makeHost({ analytics: true });
    runIntegrations([mixpanel({ token: "not-a-token" })], host);
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(el()).toBeNull();
    expect(w().mixpanel).toBeUndefined();
  });

  it("marks error on load failure, drops the queue and retries on the next grant", async () => {
    const { host, set } = makeHost({ analytics: true });
    const runner = runIntegrations([mixpanel(CONFIG)], host);
    await flush();
    fireError();
    await flush();
    expect(runner.status().mixpanel).toBe("error");
    expect(el()).toBeNull();
    expect(w().mixpanel).toBeUndefined();

    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(el()?.src).toBe(LIB);
    expect(stub()._i).toHaveLength(1);
    expect(runner.status().mixpanel).toBe("loading");
  });

  it("after a restart, tells a library already on the page that consent is granted again", async () => {
    const { host, runner, fake } = await loaded();
    runner.stop();
    expect(fake.calls[fake.calls.length - 1]).toEqual(["opt_out_tracking", { delete_user: true }]);
    fake.calls = [];

    const second = runIntegrations([mixpanel(CONFIG)], host);
    await flush();
    expect(second.status().mixpanel).toBe("active");
    expect(fake.calls).toEqual([["reset"], ["opt_in_tracking"]]);
    expect(document.querySelectorAll("#cky-mixpanel")).toHaveLength(1);
  });

  it("resolves setup without touching the DOM when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    const { host } = makeHost({ analytics: true });
    const runner = runIntegrations([mixpanel(CONFIG)], host);
    await flush();
    expect(runner.status().mixpanel).toBe("active");
    vi.unstubAllGlobals();
    expect(el()).toBeNull();
  });
});

describe("mixpanel() in silence mode", () => {
  const SILENCE = { ...CONFIG, onReject: "silence" as const };

  it("loads at once opted out, notes it in development, and does not opt in before consent", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { host } = makeHost();
    const runner = runIntegrations(
      [mixpanel({ ...SILENCE, initOptions: { opt_out_tracking_by_default: false } })],
      host,
    );
    await flush();
    expect(el()?.src).toBe(LIB);
    expect(initConfigOf()).toMatchObject({
      opt_out_tracking_by_default: true,
      opt_out_persistence_by_default: true,
    });
    expect(info).toHaveBeenCalledTimes(1);
    const fake = fireLoad();
    await flush();
    expect(runner.status().mixpanel).toBe("silenced");
    // The engine's own silence on an immediately loaded integration: nothing to opt out of yet.
    expect(fake.calls.filter((c) => c[0] !== "stop_batch_senders")).toEqual([
      ["opt_out_tracking", { delete_user: true }],
    ]);
  });

  it("opts in on grant and opts out on withdrawal, keeping the script", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([mixpanel(SILENCE)], host);
    await flush();
    const fake = fireLoad();
    await flush();
    fake.calls = [];

    set("analytics", true);
    expect(runner.status().mixpanel).toBe("active");
    expect(fake.calls).toEqual([["reset"], ["opt_in_tracking"]]);

    fake.calls = [];
    set("analytics", false);
    expect(runner.status().mixpanel).toBe("silenced");
    expect(fake.calls).toEqual([
      ["stop_batch_senders"],
      ["opt_out_tracking", { delete_user: true }],
    ]);
    expect(document.querySelectorAll("#cky-mixpanel")).toHaveLength(1);
  });

  it("leaves a returning visitor Mixpanel already has as opted in alone, so $opt_in is not sent again", async () => {
    const { fake } = await loaded(SILENCE, true);
    expect(fake.calls).toEqual([]);
  });

  it("opts in a visitor who granted earlier but whom Mixpanel does not have as opted in", async () => {
    const { fake } = await loaded(SILENCE, false);
    expect(fake.calls).toEqual([["reset"], ["opt_in_tracking"]]);
  });
});

describe("mixpanelSync()", () => {
  it("injects nothing and only switches the library you load yourself", async () => {
    const fake = new FakeMixpanel(undefined);
    w().mixpanel = fake;
    const { host, set } = makeHost();
    const runner = runIntegrations([mixpanelSync({ deleteProfileOnWithdraw: false })], host);
    await flush();
    expect(el()).toBeNull();
    expect(fake.calls.filter((c) => c[0] === "opt_out_tracking")).toEqual([
      ["opt_out_tracking", { delete_user: false }],
    ]);
    fake.calls = [];

    set("analytics", true);
    expect(runner.status().mixpanel).toBe("active");
    expect(fake.calls).toEqual([["reset"], ["opt_in_tracking"]]);
  });

  it("opts in during setup when already granted, unless Mixpanel already has the visitor opted in", async () => {
    const fake = new FakeMixpanel(undefined);
    fake.optedIn = true;
    w().mixpanel = fake;
    runIntegrations([mixpanelSync()], makeHost({ analytics: true }).host);
    await flush();
    expect(fake.calls).toEqual([]);
  });
});

describe("mixpanelTrack() and the other helpers", () => {
  it("do nothing before consent, with one warning in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mixpanelTrack("signup", { plan: "pro" });
    mixpanelIdentify("user-1");
    mixpanelPeopleSet({ $name: "Jane" });
    mixpanelRegister({ plan: "pro" });
    mixpanelReset();
    expect(w().mixpanel).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("queue while the library loads, call it once loaded, and are dropped while consent is withdrawn", async () => {
    const { host, set } = makeHost({ analytics: true });
    runIntegrations([mixpanel(CONFIG)], host);
    await flush();
    mixpanelTrack("early", { a: 1 });
    expect([...stub()]).toEqual([["track", "early", { a: 1 }]]);

    const fake = fireLoad();
    await flush();
    mixpanelTrack("signup", { plan: "pro" });
    mixpanelIdentify("user-1");
    mixpanelPeopleSet({ $name: "Jane" });
    mixpanelRegister({ plan: "pro" });
    mixpanelReset();
    expect(fake.calls).toEqual([
      ["track", "signup", { plan: "pro" }],
      ["identify", "user-1"],
      ["people.set", { $name: "Jane" }],
      ["register", { plan: "pro" }],
      ["reset"],
    ]);

    set("analytics", false);
    fake.calls = [];
    mixpanelTrack("late");
    mixpanelIdentify("user-2");
    expect(fake.calls).toEqual([]);
  });
});
