import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Integration,
  type IntegrationHost,
  runIntegrations,
  warnUnknownCategories,
} from "../integrations.js";
import type { RegionDecision } from "../types.js";

const anIntegration = (over: Partial<Integration>): Integration =>
  ({
    id: "x",
    category: "analytics",
    version: 1,
    load: "afterConsent",
    onRevoke: "remove",
    setup: () => () => {},
    ...over,
  }) as Integration;

const REGION: RegionDecision = {
  region: undefined,
  regulation: "DEFAULT",
  source: "manual",
  confidence: "high",
};

/** A fake consent runtime: mutable committed consent + manual subscribers. */
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

afterEach(() => vi.restoreAllMocks());

describe("runIntegrations", () => {
  it("afterConsent + remove: loads on grant, removes on revoke, reloads on re-grant", async () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);

    // No consent yet → idle, setup not called.
    expect(setup).not.toHaveBeenCalled();
    expect(runner.status().seg).toBe("idle");

    set("analytics", true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1);
    expect(runner.status().seg).toBe("active");

    set("analytics", false);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runner.status().seg).toBe("removed");

    set("analytics", true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(2); // re-loaded fresh
    expect(runner.status().seg).toBe("active");
  });

  it("afterConsent + silence: silences on revoke, resumes on re-grant (no reload)", async () => {
    const silence = vi.fn();
    const resume = vi.fn();
    const setup = vi.fn(() => ({ silence, resume }));
    const integration: Integration = {
      id: "meta",
      category: "advertisement",
      version: 1,
      load: "afterConsent",
      onRevoke: "silence",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);

    set("advertisement", true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1);
    expect(runner.status().meta).toBe("active");

    set("advertisement", false);
    expect(silence).toHaveBeenCalledTimes(1);
    expect(runner.status().meta).toBe("silenced");

    set("advertisement", true);
    await flush();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1); // NOT re-loaded — the double-pixel guard
    expect(runner.status().meta).toBe("active");
  });

  it("immediately + keep: loads at start regardless of consent; nothing on revoke", async () => {
    const setup = vi.fn();
    const integration: Integration = {
      id: "gtag",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "keep",
      setup,
    };
    const { host, set } = makeHost(); // analytics denied
    const runner = runIntegrations([integration], host);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1); // loaded despite no consent
    expect(runner.status().gtag).toBe("active");

    set("analytics", true);
    set("analytics", false);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1); // never re-run; keep = engine does nothing
    expect(runner.status().gtag).toBe("active");
  });

  it("keep vendors can subscribe to consent changes via the ctx", async () => {
    const onChange = vi.fn();
    const integration: Integration = {
      id: "gtag",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "keep",
      setup: (ctx) => {
        ctx.onConsentChange(onChange);
      },
    };
    const { host, set } = makeHost();
    runIntegrations([integration], host);
    await flush();
    set("analytics", true);
    expect(onChange).toHaveBeenCalled();
  });

  it("async setup: goes loading → active", async () => {
    let resolveSetup: (c: () => void) => void = () => {};
    const setup = vi.fn(() => new Promise<() => void>((res) => (resolveSetup = res)));
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    set("analytics", true);
    await flush();
    expect(runner.status().seg).toBe("loading");
    resolveSetup(() => {});
    await flush();
    expect(runner.status().seg).toBe("active");
  });

  it("setup failure → error, retried on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let attempt = 0;
    const setup = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return () => {};
    });
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);

    set("analytics", true);
    await flush();
    expect(runner.status().seg).toBe("error");

    // A later change re-triggers reconcile → retry.
    set("analytics", false);
    set("analytics", true);
    await flush();
    expect(setup).toHaveBeenCalledTimes(2);
    expect(runner.status().seg).toBe("active");
  });

  it("refuses an unknown format version (does not run it)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const setup = vi.fn();
    const integration = {
      id: "future",
      category: "analytics",
      version: 999,
      load: "immediately",
      onRevoke: "keep",
      setup,
    } as unknown as Integration;
    const { host } = makeHost();
    const runner = runIntegrations([integration], host);
    await flush();
    expect(setup).not.toHaveBeenCalled();
    expect(runner.status().future).toBeUndefined();
  });

  it("guides an old { vendor } entry to builtInIntegrations (targeted warning, skipped)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // The pre-rename shape a JS caller might still pass to `integrations`.
    const legacy = { vendor: "meta", category: "advertisement" } as unknown as Integration;
    const { host } = makeHost();
    const runner = runIntegrations([legacy], host);
    await flush();
    expect(runner.status()).toEqual({}); // not run
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('looks like the old built-in format ({ vendor: "meta" })'),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("builtInIntegrations"));
  });

  it("stop() unsubscribes — no more reconciling", async () => {
    const setup = vi.fn(() => vi.fn());
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    runner.stop();
    set("analytics", true);
    await flush();
    expect(setup).not.toHaveBeenCalled();
  });

  it("stop() undoes a loaded remove vendor (real teardown)", async () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    set("analytics", true);
    await flush();
    expect(runner.status().seg).toBe("active");
    runner.stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runner.status().seg).toBe("removed");
  });

  it("stop() releases a keep vendor's consent subscription", async () => {
    const onChange = vi.fn();
    const integration: Integration = {
      id: "gtag",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "keep",
      setup: (ctx) => {
        ctx.onConsentChange(onChange);
      },
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    await flush();
    set("analytics", true);
    expect(onChange).toHaveBeenCalled();
    onChange.mockClear();
    runner.stop();
    set("analytics", false);
    expect(onChange).not.toHaveBeenCalled(); // listener released on teardown
  });

  it("undoes a vendor that finishes loading after stop() (the race)", async () => {
    const cleanup = vi.fn();
    let resolveSetup: (c: () => void) => void = () => {};
    const setup = vi.fn(() => new Promise<() => void>((res) => (resolveSetup = res)));
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "remove",
      setup,
    };
    const { host } = makeHost();
    const runner = runIntegrations([integration], host);
    await flush();
    expect(runner.status().seg).toBe("loading");
    runner.stop(); // tear down while still loading
    resolveSetup(cleanup); // setup resolves AFTER stop
    await flush();
    expect(cleanup).toHaveBeenCalledTimes(1); // undone, not left running
    expect(runner.status().seg).toBe("removed");
  });

  it("skips a duplicate id (only the first runs)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const setupA = vi.fn(() => vi.fn());
    const setupB = vi.fn(() => vi.fn());
    const mk = (setup: () => () => void): Integration => ({
      id: "dup",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "remove",
      setup,
    });
    const { host } = makeHost();
    runIntegrations([mk(setupA), mk(setupB)], host);
    await flush();
    expect(setupA).toHaveBeenCalledTimes(1);
    expect(setupB).not.toHaveBeenCalled();
  });

  it("releases a remove vendor's listeners when it is removed on revoke", async () => {
    const onChange = vi.fn();
    const cleanup = vi.fn();
    const integration: Integration = {
      id: "seg",
      category: "analytics",
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup: (ctx) => {
        ctx.onConsentChange(onChange);
        return cleanup;
      },
    };
    const { host, set } = makeHost();
    runIntegrations([integration], host);
    set("analytics", true);
    await flush();
    set("analytics", false); // revoke → remove → release subs
    expect(cleanup).toHaveBeenCalledTimes(1);
    onChange.mockClear();
    set("necessary", true); // a further change
    expect(onChange).not.toHaveBeenCalled(); // the removed vendor no longer listens
  });

  it("immediately + remove, never granted: loads once and is NOT removed (no flap)", async () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const integration: Integration = {
      id: "x",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "remove",
      setup,
    };
    const { host } = makeHost(); // analytics denied throughout
    const runner = runIntegrations([integration], host);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1); // loaded (immediately)
    expect(cleanup).not.toHaveBeenCalled(); // but NOT removed — no wasted load-then-remove
    expect(runner.status().x).toBe("active");
  });

  it("immediately + remove: removes only on a real withdrawal (granted → denied)", async () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const integration: Integration = {
      id: "x",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    await flush();
    expect(cleanup).not.toHaveBeenCalled();
    set("analytics", true); // grant
    set("analytics", false); // then withdraw
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runner.status().x).toBe("removed");
  });

  it("immediately + silence, never granted: loads then goes silent (silence stays ungated)", async () => {
    const silence = vi.fn();
    const resume = vi.fn();
    const setup = vi.fn(() => ({ silence, resume }));
    const integration: Integration = {
      id: "m",
      category: "advertisement",
      version: 1,
      load: "immediately",
      onRevoke: "silence",
      setup,
    };
    const { host, set } = makeHost(); // advertisement denied
    const runner = runIntegrations([integration], host);
    await flush();
    expect(setup).toHaveBeenCalledTimes(1); // loaded early
    expect(silence).toHaveBeenCalledTimes(1); // silenced immediately — quiet until consent
    expect(runner.status().m).toBe("silenced");
    set("advertisement", true);
    expect(resume).toHaveBeenCalledTimes(1); // resumes on consent
    expect(runner.status().m).toBe("active");
  });

  it("records a grant that happens while the script is still loading (remove still fires)", async () => {
    const cleanup = vi.fn();
    let resolveSetup: (c: () => void) => void = () => {};
    const setup = vi.fn(() => new Promise<() => void>((res) => (resolveSetup = res)));
    const integration: Integration = {
      id: "x",
      category: "analytics",
      version: 1,
      load: "immediately",
      onRevoke: "remove",
      setup,
    };
    const { host, set } = makeHost();
    const runner = runIntegrations([integration], host);
    await flush();
    expect(runner.status().x).toBe("loading"); // immediately → loading, no consent yet
    set("analytics", true); // grant WHILE loading — must be recorded
    set("analytics", false); // then withdraw WHILE loading
    resolveSetup(cleanup); // setup finishes now
    await flush();
    // A grant did happen, so the withdrawal is a real revoke → remove fires.
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runner.status().x).toBe("removed");
  });
});

describe("warnUnknownCategories()", () => {
  afterEach(() => vi.restoreAllMocks());

  it("warns when an afterConsent integration is gated on a category not in the taxonomy", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnUnknownCategories([anIntegration({ id: "segment", category: "analytics" })], ["stats", "marketing"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gated on category "analytics"'));
  });

  it("does not warn when the category exists in the taxonomy", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnUnknownCategories([anIntegration({ id: "segment", category: "stats" })], ["stats"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for an immediately-loaded integration (category doesn't gate it)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnUnknownCategories(
      [anIntegration({ id: "ga4", category: "analytics", load: "immediately", onRevoke: "keep", setup: () => {} })],
      ["stats"],
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
