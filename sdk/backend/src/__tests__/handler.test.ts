import { afterEach, describe, expect, it, vi } from "vitest";
import { type ConsentBackendOptions, createConsentBackend, type LogEntry } from "../handler.js";
import { memoryStore } from "../memory.js";
import type { ConsentStore } from "../store.js";

const ORIGIN = "https://shop.example";
const KEY = "k".repeat(32);
const BASE = "https://shop.example/api/consent";

function setup(overrides: Partial<ConsentBackendOptions> = {}) {
  const logs: LogEntry[] = [];
  const database = memoryStore();
  const backend = createConsentBackend({
    basePath: "/api/consent",
    trustedOrigins: [ORIGIN],
    database,
    apiKeys: [KEY],
    log: (entry) => void logs.push(entry),
    ...overrides,
  });
  return { backend, database, logs, call: backend.handler };
}

let sequence = 0;
function body(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    recordId: `v.${sequence}`,
    consentId: "visitor",
    categories: { necessary: true, analytics: false },
    regulation: "GDPR",
    domain: "shop.example",
    decidedAt: new Date(Date.UTC(2026, 0, 1) + sequence * 1000).toISOString(),
    taxonomyHash: "h",
    action: "reject_all",
    source: "banner",
    ...overrides,
  };
}

const save = (payload: unknown, headers: Record<string, string> = {}) =>
  new Request(BASE, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: JSON.stringify(payload),
  });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createConsentBackend options", () => {
  it.each<[string, Partial<ConsentBackendOptions>, RegExp]>([
    ["no database", { database: undefined as unknown as ConsentStore }, /database/],
    ["no trustedOrigins", { trustedOrigins: undefined as unknown as string[] }, /trustedOrigins/],
    ["an origin without a scheme", { trustedOrigins: ["shop.example"] }, /not an origin/],
    ["an origin with a path", { trustedOrigins: ["https://shop.example/app"] }, /no path/],
    ["a relative basePath", { basePath: "api" }, /basePath/],
    ["a short apiKey", { apiKeys: ["short"] }, /32 characters/],
    ["retention under a year", { retentionMonths: 6 }, /retentionMonths/],
    ["hashing without a secret", { ipAddress: { store: "hashed" } }, /secret/],
  ])("throws at setup for %s", (_name, overrides, message) => {
    expect(() => setup(overrides)).toThrow(message);
  });
});

describe("saving a record", () => {
  it("stores it, then answers a retry with 200 and stores nothing more", async () => {
    const { call, database } = setup();
    const payload = body();
    const first = await call(save(payload));
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ recordId: payload.recordId, result: "created" });
    expect((await call(save(payload))).status).toBe(200);
    expect(await database.list("visitor")).toHaveLength(1);
  });

  it("saves on the base path only, with or without a trailing slash", async () => {
    const { call } = setup();
    const post = (path: string) =>
      call(
        new Request(`${BASE}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body()),
        }),
      );
    expect((await post("/")).status).toBe(201);
    expect((await post("/consents")).status).toBe(404);
  });

  it("answers 409 when the recordId holds a different decision", async () => {
    const { call } = setup();
    const payload = body();
    await call(save(payload));
    const response = await call(save({ ...payload, action: "accept_all" }));
    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      "record_conflict",
    );
  });

  it("refuses a body over the limit even without a Content-Length", async () => {
    const { call } = setup();
    const big = JSON.stringify(body({ padding: "x".repeat(5000) }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const response = await call(
      new Request(BASE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: stream,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.status).toBe(413);
  });

  it("refuses a declared Content-Length over the limit before reading", async () => {
    const { call } = setup();
    const response = await call(save(body(), { "content-length": "999999" }));
    expect(response.status).toBe(413);
  });

  it("answers 400 to an empty body", async () => {
    const { call } = setup();
    const response = await call(
      new Request(BASE, { method: "POST", headers: { "content-type": "application/json" } }),
    );
    expect(response.status).toBe(400);
  });

  it("warns once when a browser sends an owner key", async () => {
    const { call, logs } = setup();
    await call(save(body(), { authorization: `Bearer ${KEY}` }));
    await call(save(body(), { authorization: `Bearer ${KEY}` }));
    expect(logs.filter((l) => l.event === "owner_key_exposed")).toHaveLength(1);
  });

  it("stores no IP address by default", async () => {
    const { call, database } = setup();
    await call(save(body(), { "x-forwarded-for": "203.0.113.9" }));
    expect((await database.current("visitor"))?.ip).toBeNull();
  });

  it("stores a truncated address when asked", async () => {
    const { call, database } = setup({ ipAddress: { store: "truncated" } });
    await call(save(body(), { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));
    expect((await database.current("visitor"))?.ip).toBe("203.0.113.0");
  });

  it("stores a keyed hash when asked, and nothing when there is no address", async () => {
    const { call, database } = setup({
      ipAddress: { store: "hashed", secret: "s".repeat(32), headers: ["x-client-ip"] },
    });
    await call(save(body(), { "x-client-ip": "203.0.113.9" }));
    expect((await database.current("visitor"))?.ip).toMatch(/^[0-9a-f]{32}$/);
    await call(save(body({ consentId: "other" })));
    expect((await database.current("other"))?.ip).toBeNull();
  });
});

describe("origins", () => {
  it("refuses a browser on an untrusted origin, and a preflight from one", async () => {
    const { call } = setup();
    expect((await call(save(body(), { origin: "https://evil.example" }))).status).toBe(403);
    const preflight = await call(
      new Request(BASE, { method: "OPTIONS", headers: { origin: "https://evil.example" } }),
    );
    expect(preflight.status).toBe(403);
    expect(preflight.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("matches subdomains for a wildcard origin, but not the bare domain or another port", async () => {
    const { call } = setup({ trustedOrigins: ["https://*.shop.example"] });
    expect((await call(save(body(), { origin: "https://eu.shop.example" }))).status).toBe(201);
    expect((await call(save(body(), { origin: "https://shop.example" }))).status).toBe(403);
    expect((await call(save(body(), { origin: "https://eu.shop.example:8443" }))).status).toBe(403);
    expect((await call(save(body(), { origin: "null" }))).status).toBe(403);
  });

  it("answers a trusted preflight with the methods and headers the SDK uses", async () => {
    const { call } = setup();
    const response = await call(
      new Request(BASE, { method: "OPTIONS", headers: { origin: ORIGIN } }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type, Authorization",
    );
    expect(response.headers.get("vary")).toBe("Origin");
  });
});

describe("rate limiting", () => {
  it("refuses a visitor past the limit with 429 and Retry-After", async () => {
    const { call } = setup({ rateLimit: { perVisitor: 2, windowMs: 30_000 } });
    expect((await call(save(body()))).status).toBe(201);
    expect((await call(save(body()))).status).toBe(201);
    const third = await call(save(body()));
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBe("30");
  });

  it("refuses a client address past the limit, and counts again in a new window", async () => {
    vi.useFakeTimers();
    const { call } = setup({ rateLimit: { perClient: 1 } });
    const from = { "x-real-ip": "198.51.100.1" };
    expect((await call(save(body({ consentId: "a" }), from))).status).toBe(201);
    expect((await call(save(body({ consentId: "b" }), from))).status).toBe(429);
    vi.advanceTimersByTime(60_000);
    expect((await call(save(body({ consentId: "c" }), from))).status).toBe(201);
  });

  it("uses a limiter you pass, and can be turned off", async () => {
    const limiter = vi.fn(async () => false);
    expect((await setup({ rateLimit: { limiter } }).call(save(body()))).status).toBe(429);
    expect(limiter).toHaveBeenCalledWith("visitor:visitor", 10, 60_000);
    const { call } = setup({ rateLimit: false });
    for (let i = 0; i < 15; i++) expect((await call(save(body()))).status).toBe(201);
  });
});

describe("reading a visitor's current decision", () => {
  it("returns the latest decision without the IP address", async () => {
    const { call } = setup({ ipAddress: { store: "truncated" } });
    await call(save(body(), { "x-real-ip": "203.0.113.9" }));
    const latest = body({ action: "accept_all" });
    await call(save(latest, { "x-real-ip": "203.0.113.9" }));
    const response = await call(
      new Request(`${BASE}/consents/visitor/current`, { headers: { origin: ORIGIN } }),
    );
    const { record } = (await response.json()) as { record: Record<string, unknown> };
    expect(record.recordId).toBe(latest.recordId);
    expect("ip" in record).toBe(false);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("is refused to an untrusted origin and absent with readBack: false", async () => {
    const untrusted = await setup().call(
      new Request(`${BASE}/consents/visitor/current`, {
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(untrusted.status).toBe(403);
    const off = await setup({ readBack: false }).call(
      new Request(`${BASE}/consents/visitor/current`),
    );
    expect(off.status).toBe(404);
  });

  it("is rate limited per client address", async () => {
    const { call } = setup({ rateLimit: { perClient: 1 } });
    const read = () =>
      call(
        new Request(`${BASE}/consents/visitor/current`, {
          headers: { "x-real-ip": "198.51.100.2" },
        }),
      );
    expect((await read()).status).toBe(404);
    expect((await read()).status).toBe(429);
  });
});

describe("owner routes", () => {
  const owner = (path: string, init: RequestInit = {}, key = KEY) =>
    new Request(`${BASE}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    });

  it("are closed when no apiKeys are configured", async () => {
    const { call } = setup({ apiKeys: undefined });
    for (const request of [owner("/consents/visitor"), owner("/prune", { method: "POST" })]) {
      const response = await call(request);
      expect(response.status).toBe(401);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        "owner_routes_disabled",
      );
    }
  });

  it("refuse a wrong key and a key of another length", async () => {
    const { call } = setup();
    expect((await call(owner("/consents/visitor", {}, "x".repeat(32)))).status).toBe(401);
    expect(await call(owner("/consents/visitor", {}, `${KEY}x`))).toHaveProperty("status", 401);
    expect((await call(owner("/prune", { method: "POST" }, "nope"))).status).toBe(401);
  });

  it("list, export as CSV and delete a visitor's records", async () => {
    const { call, logs } = setup();
    await call(save(body()));
    await call(save(body({ action: "accept_all" })));
    const listed = (await (await call(owner("/consents/visitor"))).json()) as {
      records: unknown[];
    };
    expect(listed.records).toHaveLength(2);
    const csv = await call(owner("/consents/visitor", { headers: { accept: "text/csv" } }));
    expect(csv.headers.get("content-disposition")).toContain("consent-records.csv");
    expect((await csv.text()).split("\r\n")[0]).toMatch(/^record_id,consent_id,decided_at/);
    const deleted = await call(owner("/consents/visitor", { method: "DELETE" }));
    expect(await deleted.json()).toEqual({ deleted: 2 });
    expect(logs[logs.length - 1]).toMatchObject({ event: "records_deleted", count: 2 });
  });

  it("prune by the retention period and log how many", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-01-15T00:00:00Z"));
    const { call, logs, backend } = setup({ retentionMonths: 12 });
    await call(save(body()));
    vi.setSystemTime(new Date("2025-01-14T00:00:00Z"));
    expect(await backend.prune()).toBe(0);
    vi.setSystemTime(new Date("2025-01-16T00:00:00Z"));
    const response = await call(owner("/prune", { method: "POST" }));
    expect(await response.json()).toEqual({ deleted: 1 });
    expect(logs[logs.length - 1]?.message).toBe(
      "Pruned 1 records received before 2024-01-16T00:00:00.000Z.",
    );
  });
});

describe("status, documents and routing", () => {
  it("reports ready with the caller's region and language", async () => {
    const { call } = setup();
    const response = await call(
      new Request(`${BASE}/status`, {
        headers: {
          "x-vercel-ip-country": "US",
          "x-vercel-ip-country-region": "CA",
          "accept-language": "en-GB,en;q=0.9",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      contract: 1,
      database: "ok",
      schema: "current",
      caller: { region: "US-CA", language: "en-GB" },
    });
  });

  it("reports the region from Cloudflare, and nothing when no header says", async () => {
    const { call } = setup();
    const cf = await call(new Request(`${BASE}/status`, { headers: { "cf-ipcountry": "DE" } }));
    expect(((await cf.json()) as { caller: unknown }).caller).toEqual({
      region: "DE",
      language: null,
    });
    const none = await call(
      new Request(`${BASE}/status`, { headers: { "x-vercel-ip-country": "FR" } }),
    );
    expect(((await none.json()) as { caller: { region: unknown } }).caller.region).toBe("FR");
  });

  it("answers 503 while migrations are pending or the database is down", async () => {
    const database = memoryStore();
    const pending = createConsentBackend({
      trustedOrigins: [],
      database: { ...database, check: async () => "pending" },
    });
    expect((await pending.handler(new Request("https://x.example/status"))).status).toBe(503);
    const logs: LogEntry[] = [];
    const down = createConsentBackend({
      trustedOrigins: [],
      database: { ...database, check: () => Promise.reject(new Error("connect ECONNREFUSED")) },
      log: (e) => void logs.push(e),
    });
    const response = await down.handler(new Request("https://x.example/status"));
    expect(await response.json()).toMatchObject({
      status: "unavailable",
      database: "unreachable",
      schema: "unknown",
    });
    expect(logs[0]?.event).toBe("database_unreachable");
  });

  it("serves the OpenAPI document and the docs page with a locked-down policy", async () => {
    const { call } = setup();
    const spec = (await (await call(new Request(`${BASE}/openapi.json`))).json()) as {
      servers: unknown;
    };
    expect(spec.servers).toEqual([{ url: "/api/consent" }]);
    const docs = await call(new Request(`${BASE}/docs`));
    expect(docs.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'",
    );
    const page = await docs.text();
    expect(page).toContain('<span class="method m-post">POST</span><code>/api/consent</code>');
    // The source prose marks code with backticks; none may reach the reader raw.
    expect(page).not.toContain("`");
    expect(page).toContain("<code>api</code>");
  });

  it("ignores trailing slashes on the request path and on basePath", async () => {
    const { call } = setup({ basePath: "/api/consent///" });
    expect((await call(new Request(`${BASE}/status///`))).status).toBe(200);
  });

  it("answers a path with a long run of slashes in linear time", async () => {
    const { call } = setup();
    // Quadratic trimming took seconds on this; the test timeout would catch a return.
    const path = `${BASE}/status${"/".repeat(100_000)}x`;
    const started = Date.now();
    expect((await call(new Request(path))).status).toBe(404);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("answers 405 with Allow for a wrong method, and 404 outside its routes", async () => {
    const { call } = setup();
    const cases: [string, string, number, string | null][] = [
      ["/", "GET", 405, "POST"],
      ["/status", "POST", 405, "GET"],
      ["/openapi.json", "POST", 405, "GET"],
      ["/docs", "DELETE", 405, "GET"],
      ["/prune", "GET", 405, "POST"],
      ["/consents/visitor/current", "POST", 405, "GET"],
      ["/consents/visitor", "POST", 405, "GET, DELETE"],
      ["/elsewhere", "GET", 404, null],
      ["/consents/%E0%A4%A", "GET", 404, null],
    ];
    for (const [path, method, status, allow] of cases) {
      const response = await call(new Request(`${BASE}${path}`, { method }));
      expect([path, response.status]).toEqual([path, status]);
      expect(response.headers.get("allow")).toBe(allow);
    }
    expect((await call(new Request("https://shop.example/api/other"))).status).toBe(404);
  });

  it("mounts at the root when no basePath is given, and exposes one handler per method", async () => {
    const backend = createConsentBackend({ trustedOrigins: [], database: memoryStore() });
    expect((await backend.routes.GET(new Request("https://x.example/status"))).status).toBe(200);
    expect(await backend.migrate({ dryRun: true })).toEqual({ applied: [], pending: [] });
  });

  it("answers 500 without details when the database fails, and logs the cause", async () => {
    const logs: LogEntry[] = [];
    const backend = createConsentBackend({
      trustedOrigins: [ORIGIN],
      basePath: "/api/consent",
      database: { ...memoryStore(), save: () => Promise.reject(new Error("disk full")) },
      log: (e) => void logs.push(e),
    });
    const response = await backend.handler(save(body()));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("disk full");
    expect(logs[0]).toMatchObject({ level: "error", message: "A request failed: disk full" });
  });

  it("logs to the console by default", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const backend = createConsentBackend({
      trustedOrigins: [ORIGIN],
      basePath: "/api/consent",
      apiKeys: [KEY],
      database: { ...memoryStore(), check: () => Promise.reject("down") },
    });
    await backend.prune();
    await backend.handler(save(body(), { authorization: `Bearer ${KEY}` }));
    await backend.handler(new Request(`${BASE}/status`));
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[cookieyes-backend\] Pruned 0 records/),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("apiKeys"));
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("could not reach the database: down"),
    );
  });
});
