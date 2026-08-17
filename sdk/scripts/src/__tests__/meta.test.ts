import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metaPixel } from "../meta.js";

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
const queue = () => (fbq() as unknown as { queue: unknown[][] } | undefined)?.queue ?? [];
const hasCall = (a: unknown[]) =>
  queue().some(
    (c) => c.length === a.length && c.every((v, i) => JSON.stringify(v) === JSON.stringify(a[i])),
  );

const flush = () => new Promise((r) => setTimeout(r, 0));
const SCRIPT = "cky-meta-pixel";
const el = () => document.getElementById(SCRIPT) as HTMLScriptElement | null;
const fbq = () => (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const clearWindow = () => {
  const w = window as unknown as { fbq?: unknown; _fbq?: unknown; __ckyFbqInit?: unknown };
  w.fbq = undefined;
  w._fbq = undefined;
  w.__ckyFbqInit = undefined;
};

beforeEach(() => {
  document.head.innerHTML = "";
  clearWindow();
});
afterEach(() => {
  clearWindow();
  vi.restoreAllMocks();
});

describe("metaPixel()", () => {
  it("loads nothing until consent", async () => {
    const { host } = makeHost();
    runIntegrations([metaPixel({ pixelId: "123" })], host);
    await flush();
    expect(el()).toBeNull();
    expect(fbq()).toBeUndefined();
  });

  it("injects the pixel on grant, initialising fbq (loading → active)", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([metaPixel({ pixelId: "123" })], host);
    set("advertisement", true);
    await flush();
    expect(el()?.src).toContain("fbevents.js");
    expect(fbq()).toBeDefined();
    // init + PageView were queued through the stub.
    const queue = (fbq() as unknown as { queue: unknown[][] }).queue;
    expect(queue.some((c) => c[0] === "init" && c[1] === "123")).toBe(true);
    expect(queue.some((c) => c[0] === "track" && c[1] === "PageView")).toBe(true);
    expect(runner.status().meta).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().meta).toBe("active");
  });

  it("silences on revoke: fbq consent revoke + clears _fbp/_fbc, then resumes", async () => {
    const { host, set } = makeHost({ advertisement: true });
    const runner = runIntegrations([metaPixel({ pixelId: "123" })], host);
    await flush();
    fireLoad();
    await flush();
    expect(runner.status().meta).toBe("active");

    document.cookie = "_fbp=fb.1.abc";
    document.cookie = "_fbc=fb.1.xyz";

    // Capture the consent calls the engine makes on silence/resume.
    const calls: unknown[][] = [];
    (window as unknown as { fbq: (...a: unknown[]) => void }).fbq = (...a: unknown[]) => {
      calls.push(a);
    };

    set("advertisement", false);
    expect(runner.status().meta).toBe("silenced");
    expect(calls).toContainEqual(["consent", "revoke"]);
    expect(document.cookie).not.toContain("_fbp=fb.1.abc");
    expect(document.cookie).not.toContain("_fbc=fb.1.xyz");

    set("advertisement", true);
    expect(runner.status().meta).toBe("active");
    expect(calls).toContainEqual(["consent", "grant"]);
  });

  it("marks error on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([metaPixel({ pixelId: "123" })], host);
    set("advertisement", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().meta).toBe("error");
    expect(el()).toBeNull();
    set("advertisement", false);
    set("advertisement", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("honours a custom category", async () => {
    const { host, set } = makeHost();
    runIntegrations([metaPixel({ pixelId: "123", category: "marketing" })], host);
    set("advertisement", true); // wrong category — must not load
    await flush();
    expect(el()).toBeNull();
    set("marketing", true);
    await flush();
    expect(el()).not.toBeNull();
  });

  it("resolves immediately and reuses fbq when the pixel is already loaded", async () => {
    const pre = document.createElement("script");
    pre.id = SCRIPT;
    pre.dataset.ckyLoaded = "true";
    document.head.appendChild(pre);
    const existingFbq = Object.assign((..._a: unknown[]) => {}, { queue: [] as unknown[][] });
    (window as unknown as { fbq: unknown }).fbq = existingFbq;

    const { host, set } = makeHost();
    const runner = runIntegrations([metaPixel({ pixelId: "123" })], host);
    set("advertisement", true);
    await flush();
    expect(runner.status().meta).toBe("active"); // resolved without waiting for load
    expect((window as unknown as { fbq: unknown }).fbq).toBe(existingFbq); // reused, not recreated
  });

  it("queues init + PageView only once, even after a failed-load retry (no double count)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    runIntegrations([metaPixel({ pixelId: "123" })], host);
    set("advertisement", true);
    await flush();
    fireError(); // fbevents.js fails → engine will retry
    await flush();
    set("advertisement", false);
    set("advertisement", true); // retry: re-injects the script
    await flush();
    expect(el()).not.toBeNull();
    // init + PageView must appear exactly once across both attempts.
    expect(queue().filter((c) => c[0] === "init").length).toBe(1);
    expect(queue().filter((c) => c[0] === "track" && c[1] === "PageView").length).toBe(1);
  });

  it("skips the automatic PageView when autoPageView is false", async () => {
    const { host, set } = makeHost();
    runIntegrations([metaPixel({ pixelId: "123", autoPageView: false })], host);
    set("advertisement", true);
    await flush();
    expect(hasCall(["init", "123"])).toBe(true);
    expect(hasCall(["track", "PageView"])).toBe(false);
  });

  it("enables Limited Data Use automatically for a CCPA visitor (before init)", async () => {
    const { host, set } = makeHost({}, CCPA_REGION);
    runIntegrations([metaPixel({ pixelId: "123" })], host);
    set("advertisement", true);
    await flush();
    expect(hasCall(["dataProcessingOptions", ["LDU"], 0, 0])).toBe(true);
    // and it's queued before init.
    const q = queue();
    const ldu = q.findIndex((c) => c[0] === "dataProcessingOptions");
    const init = q.findIndex((c) => c[0] === "init");
    expect(ldu).toBeLessThan(init);
  });

  it("does not enable LDU for a non-US visitor, and an explicit false wins", async () => {
    const a = makeHost({}, REGION); // DEFAULT
    runIntegrations([metaPixel({ pixelId: "123" })], a.host);
    a.set("advertisement", true);
    await flush();
    expect(hasCall(["dataProcessingOptions", ["LDU"], 0, 0])).toBe(false);
    clearWindow();
    const b = makeHost({}, CCPA_REGION);
    runIntegrations([metaPixel({ pixelId: "123", limitedDataUse: false })], b.host);
    b.set("advertisement", true);
    await flush();
    expect(hasCall(["dataProcessingOptions", ["LDU"], 0, 0])).toBe(false);
  });

  it("allows an id override", () => {
    expect(metaPixel({ pixelId: "123" }).id).toBe("meta");
    expect(metaPixel({ pixelId: "123", id: "meta2" }).id).toBe("meta2");
  });
});
