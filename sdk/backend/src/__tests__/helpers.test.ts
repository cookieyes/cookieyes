import { describe, expect, it } from "vitest";
import { recordsToCsv } from "../csv.js";
import { clientIp, DEFAULT_IP_HEADERS, hashIp, truncateIp } from "../ip.js";
import { createMemoryRateLimiter } from "../rate-limit.js";
import { d1Store, sqliteStore } from "../sqlite.js";
import type { StoredRecord } from "../store.js";

describe("truncateIp", () => {
  it.each([
    ["203.0.113.9", "203.0.113.0"],
    ["::ffff:203.0.113.9", "203.0.113.0"],
    ["2001:db8:85a3:8d3:1319:8a2e:370:7348", "2001:db8:85a3::"],
    ["2001:0db8:0000::1", "2001:db8:0::"],
    ["fe80::1%eth0", "fe80:0:0::"],
    ["::1", "0:0:0::"],
    ["::", "0:0:0::"],
  ])("reduces %s to %s", (ip, expected) => {
    expect(truncateIp(ip)).toBe(expected);
  });

  it.each([
    "256.1.1.1",
    "1.2.3",
    "not an ip",
    "1::2::3",
    "1:2:3:4:5:6:7",
    "1:2:3:4:5:6:7:8::",
    "12345::",
  ])("returns null for %s", (ip) => {
    expect(truncateIp(ip)).toBeNull();
  });
});

describe("hashIp", () => {
  it("gives the same address the same hash, and another secret another hash", async () => {
    const a = await hashIp("203.0.113.9", "secret-one");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(await hashIp("203.0.113.9", "secret-one")).toBe(a);
    expect(await hashIp("203.0.113.9", "secret-two")).not.toBe(a);
  });
});

describe("clientIp", () => {
  it("takes the first listed header that is set, and the first hop of X-Forwarded-For", () => {
    const headers = new Headers({
      "x-forwarded-for": " 198.51.100.1 , 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(clientIp(headers, DEFAULT_IP_HEADERS)).toBe("198.51.100.2");
    expect(clientIp(headers, ["x-forwarded-for"])).toBe("198.51.100.1");
    expect(clientIp(new Headers(), DEFAULT_IP_HEADERS)).toBeNull();
  });
});

describe("recordsToCsv", () => {
  const record: StoredRecord = {
    recordId: "r1",
    consentId: "=HYPERLINK(1)",
    decidedAt: "2026-03-01T10:00:00.000Z",
    receivedAt: "2026-03-01T10:00:01.000Z",
    granted: ["necessary", "analytics"],
    denied: [],
    regulation: "GDPR",
    region: null,
    domain: 'shop "eu"',
    taxonomyHash: "h",
    action: "save",
    source: "preferences",
    sdkVersion: "0.12.0",
    gpc: false,
    ip: null,
  };

  it("writes a header row and one plain row per decision", () => {
    const [header, row, end] = recordsToCsv([record]).split("\r\n");
    expect(header).toBe(
      "record_id,consent_id,decided_at,received_at,granted,denied,regulation,region,domain,taxonomy_hash,action,source,sdk_version,gpc,ip",
    );
    expect(row).toBe(
      `r1,'=HYPERLINK(1),2026-03-01T10:00:00.000Z,2026-03-01T10:00:01.000Z,"necessary,analytics",,GDPR,,"shop ""eu""",h,save,preferences,0.12.0,false,`,
    );
    expect(end).toBe("");
  });
});

describe("createMemoryRateLimiter", () => {
  it("forgets every key rather than grow without bound under a flood of new ones", () => {
    const limit = createMemoryRateLimiter();
    expect(limit("first", 1, 60_000)).toBe(true);
    expect(limit("first", 1, 60_000)).toBe(false);
    for (let i = 0; i < 10_000; i++) limit(`flood-${i}`, 1, 60_000);
    expect(limit("first", 1, 60_000)).toBe(true);
  });
});

describe("SQLite adapters", () => {
  it("runs statements that return no rows with run(), for better-sqlite3", async () => {
    const calls: string[] = [];
    const store = sqliteStore({
      prepare: (sql) => ({
        reader: !/^(CREATE|INSERT INTO cookieyes_migrations)/.test(sql),
        all: () => {
          calls.push(`all ${sql.slice(0, 6)}`);
          return [];
        },
        run: () => {
          calls.push(`run ${sql.slice(0, 6)}`);
          return { changes: 0 };
        },
      }),
    });
    await store.migrate();
    expect(calls).toContain("run CREATE");
    expect(calls).not.toContain("all CREATE");
  });

  it("binds parameters and reads results on D1", async () => {
    const bound: unknown[][] = [];
    const store = d1Store({
      prepare: (sql) => ({
        bind: (...params) => {
          bound.push(params);
          return {
            all: async () =>
              sql.startsWith("DELETE")
                ? { results: [{ record_id: "a" }] }
                : sql.startsWith("SELECT id")
                  ? {}
                  : { results: [] },
          };
        },
      }),
    });
    expect(await store.remove("visitor")).toBe(1);
    expect(bound[bound.length - 1]).toEqual(["visitor"]);
    expect(await store.check()).toBe("pending");
  });
});
