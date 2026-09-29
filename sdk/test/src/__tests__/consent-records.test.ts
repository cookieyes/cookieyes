import type { ConsentPayload } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

/*
 * Retrying a consent record must never turn one decision into two stored records,
 * and must never merge two real decisions into one. The server below stores by
 * `recordId`, the way the SDK's docs tell a customer's server to.
 *
 * Node has no localStorage, which is where the SDK keeps a record until the
 * server confirms it, so these tests give it a small in-memory one. It lives in
 * this file only; the harness itself still needs no browser.
 */

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  };
}

/** A server that stores each record by its recordId, and can lose its reply once. */
function recordStore() {
  const stored = new Map<string, ConsentPayload>();
  let loseNextReply = false;
  return {
    stored,
    loseNextReply: () => {
      loseNextReply = true;
    },
    backend: {
      persist: async (record: ConsentPayload) => {
        stored.set(record.recordId ?? "", record);
        if (loseNextReply) {
          loseNextReply = false;
          throw new Error("the reply was lost after the record was stored");
        }
      },
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
  vi.stubGlobal("localStorage", memoryStorage());
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  resetConsentTestState();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("retried consent records", () => {
  it("stores a record once when it is sent again after a lost reply", async () => {
    const server = recordStore();
    server.loseNextReply();
    const firstPage = createConsentTest({ mode: "self-hosted", backend: server.backend });
    firstPage.acceptAll();
    await vi.advanceTimersByTimeAsync(0);

    // The next page sends the unconfirmed record again, with the same id.
    const nextPage = createConsentTest({
      mode: "self-hosted",
      backend: server.backend,
      consentId: firstPage.snapshot().consentId,
      initialConsent: {},
    });
    await vi.advanceTimersByTimeAsync(0);

    const sends = [...firstPage.backendCalls(), ...nextPage.backendCalls()];
    expect(sends).toHaveLength(2);
    expect(new Set(sends.map((r) => r.recordId)).size).toBe(1);
    expect(server.stored.size).toBe(1);
  });

  it("keeps a change of mind and back as separate records", async () => {
    const server = recordStore();
    const consent = createConsentTest({ mode: "self-hosted", backend: server.backend });
    consent.acceptAll();
    await vi.advanceTimersByTimeAsync(4000);
    consent.rejectAll();
    await vi.advanceTimersByTimeAsync(4000);
    consent.acceptAll(); // the same choice as the first, as a new decision

    const [first, , third] = consent.backendCalls();
    expect(third?.categories).toEqual(first?.categories);
    expect(third?.recordId).not.toBe(first?.recordId);
    expect(server.stored.size).toBe(3);
  });

  it("keeps the same recordId across a reload and a browser restart", async () => {
    const server = recordStore();
    server.loseNextReply();
    const beforeRestart = createConsentTest({ mode: "self-hosted", backend: server.backend });
    beforeRestart.rejectAll();
    await vi.advanceTimersByTimeAsync(0);
    const original = beforeRestart.backendCalls()[0];
    resetConsentTestState(); // everything in memory is gone; the stored record stays

    const afterRestart = createConsentTest({
      mode: "self-hosted",
      backend: server.backend,
      consentId: original?.consentId,
      initialConsent: {},
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(afterRestart.backendCalls()[0]).toEqual(original);
    expect(server.stored.size).toBe(1);
  });

  it("never gives two visitors the same recordId for the same choice at the same moment", async () => {
    const ids: (string | undefined)[] = [];
    for (const consentId of ["visitor-a", "visitor-b"]) {
      vi.stubGlobal("localStorage", memoryStorage()); // each visitor is a different browser
      const consent = createConsentTest({ mode: "self-hosted", consentId, initialConsent: {} });
      consent.acceptAll();
      await vi.advanceTimersByTimeAsync(0);
      ids.push(consent.backendCalls()[0]?.recordId);
      resetConsentTestState();
    }
    expect(ids[0]).not.toBe(ids[1]);
  });
});
