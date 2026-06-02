import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConsentPayload, pushConsent } from "../sync.js";
import type { ConsentSnapshot } from "../types.js";

const snapshot: ConsentSnapshot = {
  consentId: "abc123",
  hasActed: true,
  categories: {
    necessary: true,
    functional: true,
    analytics: false,
    performance: false,
    advertisement: false,
  },
  regulation: "GDPR",
  lastRenewed: 1700000000000,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildConsentPayload", () => {
  it("maps a snapshot to the wire payload including the current hostname", () => {
    const payload = buildConsentPayload(snapshot);
    expect(payload).toEqual({
      consentId: "abc123",
      categories: snapshot.categories,
      regulation: "GDPR",
      domain: window.location.hostname,
    });
  });
});

describe("pushConsent", () => {
  it("POSTs the payload as JSON with keepalive", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await pushConsent("https://api.example.com/consent", undefined, snapshot);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const args = fetchMock.mock.calls[0] ?? [];
    const url = args[0];
    const init = args[1];
    expect(url).toBe("https://api.example.com/consent");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body).consentId).toBe("abc123");
  });

  it("adds a Bearer Authorization header when an apiKey is supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await pushConsent("https://api.example.com/consent", "secret-key", snapshot);

    const init = (fetchMock.mock.calls[0] ?? [])[1];
    expect(init.headers.Authorization).toBe("Bearer secret-key");
  });

  it("swallows network errors so the consent flow never fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pushConsent("https://api.example.com/consent", undefined, snapshot),
    ).resolves.toBeUndefined();
  });
});
