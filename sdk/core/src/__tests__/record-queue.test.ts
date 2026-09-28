import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentManager } from "../manager.js";
import {
  createRecordQueue,
  MAX_KEPT_AGE_MS,
  MAX_KEPT_RECORDS,
  RETRY_DELAYS_MS,
} from "../record-queue.js";
import type { ConsentPayload } from "../types.js";

const STORAGE_KEY = "cookieyes-consent-records";

/** A server you can switch on and off, recording what it confirmed. */
function fakeServer() {
  const server = { up: true, received: [] as ConsentPayload[], calls: 0 };
  const backend = {
    persist: async (record: ConsentPayload) => {
      server.calls++;
      if (!server.up) throw new Error("server down");
      server.received.push(record);
    },
  };
  return { server, backend };
}

let seq = 0;
function record(overrides: Partial<ConsentPayload> = {}): ConsentPayload {
  seq++;
  return {
    recordId: `r${seq}`,
    consentId: "visitor",
    categories: { necessary: true },
    regulation: "GDPR",
    domain: "example.com",
    decidedAt: new Date().toISOString(),
    ...overrides,
  };
}

const kept = (): ConsentPayload[] => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("record queue", () => {
  it("keeps a record until the server confirms it, then removes it", async () => {
    let confirm: () => void = () => undefined;
    const slow = { persist: () => new Promise<void>((resolve) => (confirm = resolve)) };
    createRecordQueue({ backend: slow }).send(record());
    expect(kept()).toHaveLength(1); // saved before it is sent, kept while in flight
    confirm();
    await settle();
    expect(kept()).toHaveLength(0);
  });

  it("sends a new record right away, even while an earlier one is still being sent", () => {
    const sent: string[] = [];
    const slow = {
      persist: (r: ConsentPayload) => {
        sent.push(r.recordId ?? "");
        return new Promise<void>(() => undefined); // never confirms
      },
    };
    const queue = createRecordQueue({ backend: slow });
    const first = record();
    const second = record();
    queue.send(first);
    queue.send(second);
    // The second is sent at once, and the first is not sent a second time meanwhile.
    expect(sent).toEqual([first.recordId, second.recordId]);
  });

  it("keeps a record the server did not accept", async () => {
    const { server, backend } = fakeServer();
    server.up = false;
    createRecordQueue({ backend }).send(record());
    await settle();
    expect(kept()).toHaveLength(1);
  });

  it("retries kept records on the next page start", async () => {
    const { server, backend } = fakeServer();
    server.up = false;
    const manager = createConsentManager({ regulation: "GDPR", backend });
    manager.acceptAll("banner");
    await settle();
    expect(kept()).toHaveLength(1);

    server.up = true;
    createConsentManager({ regulation: "GDPR", backend }); // the next page
    await settle();
    expect(server.received.map((r) => r.action)).toEqual(["accept_all"]);
    expect(kept()).toHaveLength(0);
  });

  it("retries on a staggered timer while the page stays open", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // no spread: exactly the base delay
    const { server, backend } = fakeServer();
    server.up = false;
    createRecordQueue({ backend }).send(record());
    await vi.advanceTimersByTimeAsync(0);
    expect(server.calls).toBe(1);

    await vi.advanceTimersByTimeAsync((RETRY_DELAYS_MS[0] ?? 0) - 1);
    expect(server.calls).toBe(1); // not before the first delay
    await vi.advanceTimersByTimeAsync(1);
    expect(server.calls).toBe(2);

    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[1] ?? 0);
    expect(server.calls).toBe(3); // the next wait is longer

    server.up = true;
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[2] ?? 0);
    expect(server.received).toHaveLength(1);
    expect(kept()).toHaveLength(0);
  });

  it("retries as soon as the browser is back online", async () => {
    const { server, backend } = fakeServer();
    server.up = false;
    createRecordQueue({ backend }).send(record());
    await settle();
    server.up = true;
    window.dispatchEvent(new Event("online"));
    await settle();
    expect(server.received).toHaveLength(1);
  });

  it("sends every kept record, so one refused record doesn't hold up the rest", async () => {
    const refused = record();
    const received: string[] = [];
    const backend = {
      persist: async (r: ConsentPayload) => {
        if (r.recordId === refused.recordId) throw new Error("400");
        received.push(r.recordId ?? "");
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([refused, record(), record()]));
    await createRecordQueue({ backend }).flush();
    expect(received).toHaveLength(2);
    expect(kept().map((r) => r.recordId)).toEqual([refused.recordId]);
  });

  it("keeps a record once, even if it is sent again", async () => {
    const { server, backend } = fakeServer();
    server.up = false;
    const queue = createRecordQueue({ backend });
    const same = record();
    queue.send(same);
    queue.send({ ...same });
    await settle();
    expect(kept()).toHaveLength(1);
  });

  it(`keeps at most ${MAX_KEPT_RECORDS} records, dropping the oldest`, async () => {
    const { server, backend } = fakeServer();
    server.up = false;
    const queue = createRecordQueue({ backend });
    const all = Array.from({ length: MAX_KEPT_RECORDS + 5 }, () => record());
    for (const r of all) queue.send(r);
    await settle();
    const ids = kept().map((r) => r.recordId);
    expect(ids).toHaveLength(MAX_KEPT_RECORDS);
    expect(ids[0]).toBe(all[5]?.recordId);
  });

  it("drops records older than the age limit", async () => {
    const { server, backend } = fakeServer();
    const stale = record({
      decidedAt: new Date(Date.now() - MAX_KEPT_AGE_MS - 1000).toISOString(),
    });
    const fresh = record();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([stale, fresh]));
    await createRecordQueue({ backend }).flush();
    expect(server.received.map((r) => r.recordId)).toEqual([fresh.recordId]);
  });

  it("still sends once when storage is full or unavailable, and never throws", async () => {
    const { server, backend } = fakeServer();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const manager = createConsentManager({ regulation: "GDPR", backend });
    expect(() => manager.acceptAll("banner")).not.toThrow();
    await settle();
    expect(server.received).toHaveLength(1);
    expect(manager.hasActed).toBe(true);
  });

  it("treats unreadable storage as empty", async () => {
    const { server, backend } = fakeServer();
    localStorage.setItem(STORAGE_KEY, "{not json");
    await createRecordQueue({ backend }).flush();
    expect(server.calls).toBe(0);
  });

  it("keeps nothing without a server to send to", () => {
    createConsentManager({ regulation: "GDPR" }).acceptAll("banner");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
