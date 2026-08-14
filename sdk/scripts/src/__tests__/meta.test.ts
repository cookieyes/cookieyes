import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metaPixel } from "../meta.js";

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
const SCRIPT = "cky-meta-pixel";
const el = () => document.getElementById(SCRIPT) as HTMLScriptElement | null;
const fbq = () => (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const clearWindow = () => {
  (window as unknown as { fbq?: unknown; _fbq?: unknown }).fbq = undefined;
  (window as unknown as { fbq?: unknown; _fbq?: unknown })._fbq = undefined;
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

  it("allows an id override", () => {
    expect(metaPixel({ pixelId: "123" }).id).toBe("meta");
    expect(metaPixel({ pixelId: "123", id: "meta2" }).id).toBe("meta2");
  });
});
