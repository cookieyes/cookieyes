import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installNetworkBlocker,
  type NetworkBlockerRule,
  uninstallNetworkBlocker,
} from "../network-blocker.js";

const ruleGA: NetworkBlockerRule = {
  id: "ga",
  domain: "google-analytics.com",
  category: "analytics",
};
const ruleFB: NetworkBlockerRule = {
  id: "facebook",
  domain: "facebook.com",
  pathIncludes: "/tr",
  methods: ["POST"],
  category: "advertisement",
};

let originalFetch: typeof fetch;
const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchMock.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.fetch = fetchMock;
});

afterEach(() => {
  uninstallNetworkBlocker();
  globalThis.fetch = originalFetch;
});

describe("installNetworkBlocker", () => {
  it("blocks fetch when category is not consented", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    await expect(window.fetch("https://www.google-analytics.com/collect")).rejects.toThrow(
      /Blocked by consent/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows fetch when category is consented", async () => {
    const consents: Record<string, boolean> = { analytics: true };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    await window.fetch("https://www.google-analytics.com/collect");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("matches subdomains", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    await expect(window.fetch("https://region1.google-analytics.com/g/collect")).rejects.toThrow(
      /Blocked by consent/,
    );
  });

  it("does not block other domains", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    await window.fetch("https://api.example.com/data");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("respects pathIncludes filter", async () => {
    const consents: Record<string, boolean> = { advertisement: false };
    installNetworkBlocker(
      { rules: [ruleFB], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    // Path doesn't match → not blocked
    await window.fetch("https://www.facebook.com/login", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledOnce();

    // Path matches → blocked
    await expect(
      window.fetch("https://www.facebook.com/tr?id=123", { method: "POST" }),
    ).rejects.toThrow(/Blocked by consent/);
  });

  it("respects methods filter", async () => {
    const consents: Record<string, boolean> = { advertisement: false };
    installNetworkBlocker(
      { rules: [ruleFB], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    // GET on /tr should NOT be blocked (rule is POST-only)
    await window.fetch("https://www.facebook.com/tr?id=123");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("calls onRequestBlocked when a request is blocked", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    const onBlocked = vi.fn();
    installNetworkBlocker(
      { rules: [ruleGA], onRequestBlocked: onBlocked, logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    await window.fetch("https://www.google-analytics.com/collect").catch(() => undefined);
    expect(onBlocked).toHaveBeenCalledOnce();
    expect(onBlocked.mock.calls[0]?.[0]?.rule.id).toBe("ga");
  });

  it("uninstall restores original fetch", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );
    uninstallNetworkBlocker();

    await window.fetch("https://www.google-analytics.com/collect");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("re-evaluates consent dynamically (not at install time)", async () => {
    const consents: Record<string, boolean> = { analytics: false };
    installNetworkBlocker(
      { rules: [ruleGA], logBlockedRequests: false },
      (cat) => consents[cat] === true,
    );

    // First call: blocked
    await expect(window.fetch("https://www.google-analytics.com/collect")).rejects.toThrow(
      /Blocked by consent/,
    );

    // User grants consent
    consents.analytics = true;

    // Next call: allowed
    const res = await window.fetch("https://www.google-analytics.com/collect");
    expect(res.status).toBe(200);
  });

  it("warns to the console by default when a request is blocked", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    installNetworkBlocker({ rules: [ruleGA] }, () => false);
    await window.fetch("https://www.google-analytics.com/collect").catch(() => undefined);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toContain("[cookieyes] blocked");
    warn.mockRestore();
  });

  it("blocks a fetch given a URL instance", async () => {
    installNetworkBlocker({ rules: [ruleGA], logBlockedRequests: false }, () => false);
    await expect(window.fetch(new URL("https://www.google-analytics.com/collect"))).rejects.toThrow(
      /Blocked by consent/,
    );
  });

  it("blocks a fetch given a Request instance", async () => {
    installNetworkBlocker({ rules: [ruleGA], logBlockedRequests: false }, () => false);
    const req = new Request("https://www.google-analytics.com/collect", { method: "GET" });
    await expect(window.fetch(req)).rejects.toThrow(/Blocked by consent/);
  });

  it("is a noop when there are no rules", async () => {
    const dispose = installNetworkBlocker({ rules: [], logBlockedRequests: false }, () => false);
    await window.fetch("https://www.google-analytics.com/collect");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(dispose).toBeTypeOf("function");
  });

  it("ignores a second install while one is already active", async () => {
    installNetworkBlocker({ rules: [ruleGA], logBlockedRequests: false }, () => false);
    const second = installNetworkBlocker(
      { rules: [ruleFB], logBlockedRequests: false },
      () => false,
    );
    expect(second).toBeTypeOf("function");
    await expect(window.fetch("https://www.google-analytics.com/collect")).rejects.toThrow(
      /Blocked by consent/,
    );
  });
});

describe("installNetworkBlocker — XMLHttpRequest", () => {
  let realOpen: typeof XMLHttpRequest.prototype.open;
  let realSend: typeof XMLHttpRequest.prototype.send;
  let sendMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    realOpen = XMLHttpRequest.prototype.open;
    realSend = XMLHttpRequest.prototype.send;
    // Replace the real transport BEFORE install so the blocker captures these
    // as "originals" — the allowed path then calls our mock, never the network.
    XMLHttpRequest.prototype.open = vi.fn() as unknown as typeof XMLHttpRequest.prototype.open;
    sendMock = vi.fn();
    XMLHttpRequest.prototype.send = sendMock as unknown as typeof XMLHttpRequest.prototype.send;
  });

  afterEach(() => {
    uninstallNetworkBlocker();
    XMLHttpRequest.prototype.open = realOpen;
    XMLHttpRequest.prototype.send = realSend;
  });

  it("aborts and notifies when an XHR target is not consented", () => {
    const onBlocked = vi.fn();
    installNetworkBlocker(
      { rules: [ruleGA], onRequestBlocked: onBlocked, logBlockedRequests: false },
      () => false,
    );

    const xhr = new XMLHttpRequest();
    const abortSpy = vi.spyOn(xhr, "abort").mockImplementation(() => undefined);
    xhr.open("GET", "https://www.google-analytics.com/collect");
    xhr.send();

    expect(onBlocked).toHaveBeenCalledOnce();
    expect(abortSpy).toHaveBeenCalledOnce();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("lets a consented XHR through to the original send", () => {
    installNetworkBlocker({ rules: [ruleGA], logBlockedRequests: false }, () => true);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://www.google-analytics.com/collect");
    xhr.send();

    expect(sendMock).toHaveBeenCalledOnce();
  });
});
