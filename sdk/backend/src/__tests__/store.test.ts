import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ConsentStore, StoredRecord } from "../store.js";
import { ENGINES, type Engine } from "./engines.js";

function record(overrides: Partial<StoredRecord> = {}): StoredRecord {
  return {
    recordId: "visitor-a.1.x",
    consentId: "visitor-a",
    decidedAt: "2026-03-01T10:00:00.000Z",
    receivedAt: "2026-03-01T10:00:01.000Z",
    granted: ["necessary", "analytics"],
    denied: ["advertisement"],
    regulation: "GDPR",
    region: "DE",
    domain: "shop.example",
    taxonomyHash: "abc123",
    action: "accept_selected",
    source: "preferences",
    sdkVersion: "0.12.0",
    gpc: true,
    ip: "203.0.113.0",
    ...overrides,
  };
}

// A first PGlite boot can take several seconds when every package tests at once.
const BOOT_TIMEOUT_MS = 60_000;

describe.each(ENGINES)("ConsentStore on $name", (engine) => {
  let database: Awaited<ReturnType<Engine["start"]>>;
  let store: ConsentStore;

  beforeAll(async () => {
    database = await engine.start();
  }, BOOT_TIMEOUT_MS);
  afterAll(() => database.close());
  beforeEach(async () => {
    store = await database.fresh();
    await store.migrate();
  });

  it("stores a record and reads every field back unchanged", async () => {
    const original = record();
    expect(await store.save(original)).toBe("created");
    expect(await store.list("visitor-a")).toEqual([original]);
  });

  it("reads back empty lists and missing optional fields", async () => {
    const sparse = record({ granted: [], region: null, sdkVersion: null, gpc: null, ip: null });
    await store.save(sparse);
    expect(await store.current("visitor-a")).toEqual(sparse);
  });

  it("keeps a false gpc distinct from a missing one", async () => {
    await store.save(record({ gpc: false }));
    expect((await store.current("visitor-a"))?.gpc).toBe(false);
  });

  it("answers replayed for the same decision, even when it arrives later from elsewhere", async () => {
    await store.save(record());
    const retry = record({ receivedAt: "2026-03-02T00:00:00.000Z", ip: "198.51.100.0" });
    expect(await store.save(retry)).toBe("replayed");
    expect(await store.list("visitor-a")).toHaveLength(1);
  });

  it("answers conflict for a different decision under a taken recordId, and keeps the first", async () => {
    await store.save(record());
    expect(await store.save(record({ granted: ["necessary"], denied: [] }))).toBe("conflict");
    expect((await store.current("visitor-a"))?.granted).toEqual(["necessary", "analytics"]);
  });

  it("stores ten copies that arrive at once exactly once", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => store.save(record())));
    expect(results.filter((r) => r === "created")).toHaveLength(1);
    expect(results.filter((r) => r === "replayed")).toHaveLength(9);
    expect(await store.list("visitor-a")).toHaveLength(1);
  });

  it("returns the latest decision as current and lists them oldest first", async () => {
    const first = record({ recordId: "a.1", decidedAt: "2026-03-01T10:00:00.000Z" });
    const second = record({ recordId: "a.2", decidedAt: "2026-03-05T10:00:00.000Z" });
    await store.save(second);
    await store.save(first);
    await store.save(record({ recordId: "b.1", consentId: "visitor-b" }));
    expect((await store.current("visitor-a"))?.recordId).toBe("a.2");
    expect((await store.list("visitor-a")).map((r) => r.recordId)).toEqual(["a.1", "a.2"]);
    expect(await store.current("nobody")).toBeNull();
  });

  it("deletes every record for one visitor and only theirs", async () => {
    await store.save(record({ recordId: "a.1" }));
    await store.save(record({ recordId: "a.2", decidedAt: "2026-04-01T00:00:00.000Z" }));
    await store.save(record({ recordId: "b.1", consentId: "visitor-b" }));
    expect(await store.remove("visitor-a")).toBe(2);
    expect(await store.list("visitor-a")).toEqual([]);
    expect(await store.list("visitor-b")).toHaveLength(1);
    expect(await store.remove("visitor-a")).toBe(0);
  });

  it("prunes only records received before the cutoff", async () => {
    await store.save(record({ recordId: "old", receivedAt: "2024-01-01T00:00:00.000Z" }));
    await store.save(record({ recordId: "new", receivedAt: "2026-01-01T00:00:00.000Z" }));
    expect(await store.prune(new Date("2025-01-01T00:00:00.000Z"))).toBe(1);
    expect((await store.list("visitor-a")).map((r) => r.recordId)).toEqual(["new"]);
  });

  it("reports a current schema once migrated, and migrating again changes nothing", async () => {
    expect(await store.check()).toBe("current");
    expect(await store.migrate()).toEqual({ applied: [], pending: [] });
  });
});

describe.each(ENGINES.filter((e) => e.name !== "memory"))("migrations on $name", (engine) => {
  it(
    "plans without writing, then applies, then reports nothing left",
    async () => {
      const database = await engine.start();
      try {
        const store = await database.fresh();
        expect(await store.check()).toBe("pending");
        expect(await store.migrate({ dryRun: true })).toEqual({
          applied: [],
          pending: ["0001_consent_records"],
        });
        expect(await store.check()).toBe("pending");
        expect(await store.migrate()).toEqual({ applied: ["0001_consent_records"], pending: [] });
        expect(await store.check()).toBe("current");
        expect(await store.migrate({ dryRun: true })).toEqual({ applied: [], pending: [] });
      } finally {
        await database.close();
      }
    },
    BOOT_TIMEOUT_MS,
  );
});
