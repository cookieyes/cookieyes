import { type IntegrationHost, type RegionDecision, runIntegrations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customScript } from "../custom-script.js";

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
const ID = "cky-script-widget";
const el = () => document.getElementById(ID) as HTMLScriptElement | null;
const fireLoad = () => el()?.dispatchEvent(new Event("load"));
const fireError = () => el()?.dispatchEvent(new Event("error"));
const base = { id: "widget", src: "https://x.example/w.js", category: "functional" } as const;

beforeEach(() => {
  document.head.innerHTML = "";
  (window as unknown as { myTag?: unknown }).myTag = undefined;
});
afterEach(() => vi.restoreAllMocks());

describe("customScript()", () => {
  it("loads on grant (loading → active), removes on revoke by default", async () => {
    const { host, set } = makeHost();
    const runner = runIntegrations([customScript(base)], host);
    set("functional", true);
    await flush();
    expect(el()?.src).toContain("w.js");
    expect(runner.status().widget).toBe("loading");
    fireLoad();
    await flush();
    expect(runner.status().widget).toBe("active");
    set("functional", false);
    expect(el()).toBeNull();
    expect(runner.status().widget).toBe("removed");
  });

  it("gates on multiple categories (match 'all' by default)", async () => {
    const { host, set } = makeHost();
    runIntegrations([customScript({ ...base, category: ["functional", "analytics"] })], host);
    set("functional", true);
    await flush();
    expect(el()).toBeNull(); // only one granted → not loaded
    set("analytics", true);
    await flush();
    expect(el()).not.toBeNull(); // both granted → loaded
  });

  it("keeps the script on revoke when onRevoke is 'keep'", async () => {
    const { host, set } = makeHost();
    runIntegrations([customScript({ ...base, onRevoke: "keep" })], host);
    set("functional", true);
    await flush();
    fireLoad();
    await flush();
    set("functional", false);
    expect(el()).not.toBeNull();
  });

  it("sets up a queue stub when configured", async () => {
    const { host, set } = makeHost();
    runIntegrations(
      [customScript({ ...base, stub: { global: "myTag", methods: ["track"] } })],
      host,
    );
    set("functional", true);
    await flush();
    const tag = (window as unknown as { myTag?: { track: (s: string) => void } & unknown[] }).myTag;
    expect(tag).toBeDefined();
    tag?.track("Hi");
    expect((tag as unknown[]).length).toBe(1);
  });

  it("applies extra attributes to the script tag", async () => {
    const { host, set } = makeHost();
    runIntegrations([customScript({ ...base, attrs: { "data-id": "abc" } })], host);
    set("functional", true);
    await flush();
    expect(el()?.getAttribute("data-id")).toBe("abc");
  });

  it("errors on load failure and retries on the next grant", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, set } = makeHost();
    const runner = runIntegrations([customScript(base)], host);
    set("functional", true);
    await flush();
    fireError();
    await flush();
    expect(runner.status().widget).toBe("error");
    expect(el()).toBeNull();
    set("functional", false);
    set("functional", true);
    await flush();
    expect(el()).not.toBeNull();
  });
});
