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
  taxonomyHash: "2fbx48",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("buildConsentPayload", () => {
  it("maps a snapshot to the wire payload including the current hostname", () => {
    const payload = buildConsentPayload(snapshot, undefined, {
      action: "save",
      source: "preferences",
    });
    expect(payload).toEqual({
      recordId: expect.stringMatching(/^abc123\./),
      consentId: "abc123",
      categories: snapshot.categories,
      regulation: "GDPR",
      domain: window.location.hostname,
      decidedAt: "2023-11-14T22:13:20.000Z",
      taxonomyHash: "2fbx48",
      action: "save",
      source: "preferences",
    });
  });

  it("stamps the time of the decision, not the time the record is built", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    expect(buildConsentPayload(snapshot).decidedAt).toBe("2023-11-14T22:13:20.000Z");
  });

  it("gives the same decision the same recordId, whenever it is built", () => {
    const first = buildConsentPayload(snapshot).recordId;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    expect(buildConsentPayload({ ...snapshot }).recordId).toBe(first);
  });

  it("gives different decisions different recordIds, including a change of mind and back", () => {
    const accepted = { ...snapshot, categories: { ...snapshot.categories, analytics: true } };
    const ids = [
      buildConsentPayload(snapshot).recordId,
      buildConsentPayload({ ...accepted, lastRenewed: 1700000001000 }).recordId,
      // Back to the first choice a second later: same categories, still a new decision.
      buildConsentPayload({ ...snapshot, lastRenewed: 1700000002000 }).recordId,
      // Another visitor making the same choice at the same moment.
      buildConsentPayload({ ...snapshot, consentId: "xyz789" }).recordId,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("pushConsent", () => {
  const payload = buildConsentPayload(snapshot);

  it("POSTs the payload as JSON with keepalive", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await pushConsent("https://api.example.com/consent", undefined, payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const args = fetchMock.mock.calls[0] ?? [];
    const url = args[0];
    const init = args[1];
    expect(url).toBe("https://api.example.com/consent");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("adds a Bearer Authorization header when an apiKey is supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await pushConsent("https://api.example.com/consent", "secret-key", payload);

    const init = (fetchMock.mock.calls[0] ?? [])[1];
    expect(init.headers.Authorization).toBe("Bearer secret-key");
  });

  it("swallows network errors so the consent flow never fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pushConsent("https://api.example.com/consent", undefined, payload),
    ).resolves.toBeUndefined();
  });
});
