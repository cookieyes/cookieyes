import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConsentPayload, sendConsentRecord } from "../sync.js";
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
      // The same choice at the same moment, made by a different action.
      buildConsentPayload(snapshot, undefined, { action: "save", source: "preferences" }).recordId,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sendConsentRecord", () => {
  const payload = buildConsentPayload(snapshot);
  const apiUrl = "https://api.example.com/consent";
  const stubFetch = (impl: () => Promise<Response>) => {
    const fetchMock = vi.fn(impl);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);

  it("POSTs the payload as JSON with keepalive", async () => {
    const fetchMock = stubFetch(async () => new Response(null, { status: 204 }));

    await sendConsentRecord({ apiUrl }, payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(url).toBe(apiUrl);
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it("adds a Bearer Authorization header when an apiKey is supplied", async () => {
    const fetchMock = stubFetch(async () => new Response(null, { status: 204 }));

    await sendConsentRecord({ apiUrl, apiKey: "secret-key" }, payload);

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-key");
  });

  it("confirms a 2xx response", async () => {
    stubFetch(async () => new Response(null, { status: 201 }));
    await expect(sendConsentRecord({ apiUrl }, payload)).resolves.toBe(true);
  });

  it("reports an HTTP error as a failure, which fetch alone does not", async () => {
    const warn = quiet();
    stubFetch(async () => new Response("down", { status: 500 }));
    await expect(sendConsentRecord({ apiUrl }, payload)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 500"));
  });

  it("reports a network error as a failure without rejecting", async () => {
    quiet();
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(sendConsentRecord({ apiUrl }, payload)).resolves.toBe(false);
  });

  it("confirms a backend adapter that resolves", async () => {
    const persist = vi.fn(async () => undefined);
    await expect(sendConsentRecord({ backend: { persist } }, payload)).resolves.toBe(true);
    expect(persist).toHaveBeenCalledWith(payload);
  });

  it("reports a backend adapter that rejects or throws as a failure", async () => {
    quiet();
    const rejects = { persist: async () => Promise.reject(new Error("server down")) };
    const throws = {
      persist: () => {
        throw new Error("bad config");
      },
    };
    await expect(sendConsentRecord({ backend: rejects }, payload)).resolves.toBe(false);
    await expect(sendConsentRecord({ backend: throws }, payload)).resolves.toBe(false);
  });
});
