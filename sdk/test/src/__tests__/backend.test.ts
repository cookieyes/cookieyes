import { createConsentBackend } from "@cookieyes/backend";
import { memoryStore } from "@cookieyes/backend/memory";
import { describe, expect, it } from "vitest";
import { type BackendTarget, runBackendConformance } from "../backend.js";

const ORIGIN = "https://shop.example";
const API_KEY = "k".repeat(32);

function target(
  overrides: Partial<Parameters<typeof createConsentBackend>[0]> = {},
): BackendTarget {
  const backend = createConsentBackend({
    basePath: "/api/consent",
    trustedOrigins: [ORIGIN],
    database: memoryStore(),
    apiKeys: [API_KEY],
    log: () => {},
    ...overrides,
  });
  return {
    url: "https://shop.example/api/consent",
    trustedOrigin: ORIGIN,
    apiKey: API_KEY,
    fetch: backend.handler,
  };
}

// The reference backend must pass its own contract, with and without the optional parts.
runBackendConformance(target(), { describe, it });
runBackendConformance(
  { ...target({ readBack: false }), readBack: false, apiKey: undefined },
  { describe, it },
);

/** Collects the suite's checks so one can be run against a server that breaks it. */
function collect(t: BackendTarget): Map<string, () => Promise<void>> {
  const checks = new Map<string, () => Promise<void>>();
  runBackendConformance(t, {
    describe: (_name, fn) => fn(),
    it: (name, fn) => checks.set(name, fn),
  });
  return checks;
}

function breaking(
  rewrite: (request: Request, response: Response) => Response | Promise<Response>,
): BackendTarget {
  const good = target();
  return {
    ...good,
    fetch: async (request) =>
      rewrite(request, await (good.fetch as (r: Request) => Promise<Response>)(request.clone())),
  };
}

describe("runBackendConformance", () => {
  it("fails a server that stores a retried record twice", async () => {
    // Answers 201 to every save, as a server with no idempotency would.
    const checks = collect(
      breaking((request, response) =>
        request.method === "POST" && response.status === 200
          ? new Response(response.body, { status: 201, headers: response.headers })
          : response,
      ),
    );
    await expect(checks.get("stores a decision sent ten times exactly once")?.()).rejects.toThrow(
      /a repeated copy answered 201, expected 200/,
    );
  });

  it("fails a server that lets any origin in", async () => {
    const checks = collect(
      breaking((_request, response) =>
        response.status === 403 ? new Response("{}", { status: 201 }) : response,
      ),
    );
    await expect(
      checks.get("refuses a save from an origin it does not trust, with 403")?.(),
    ).rejects.toThrow(/answered 201, expected 403/);
  });

  it("fails a server whose errors have no code", async () => {
    const checks = collect(
      breaking((_request, response) =>
        response.status === 422 ? new Response("nope", { status: 422 }) : response,
      ),
    );
    await expect(checks.get("refuses a record without a recordId, with 422")?.()).rejects.toThrow(
      /must answer with \{ error: \{ code, message \} \}/,
    );
  });

  it("uses the global fetch when no fetch is given", async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: Request) => {
      calls.push(input.url);
      return new Response(JSON.stringify({ openapi: "3.1.0" }), { status: 200 });
    }) as typeof fetch;
    try {
      const { fetch: _inProcess, ...overHttp } = target();
      await collect(overHttp).get("serves its OpenAPI document")?.();
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toEqual(["https://shop.example/api/consent/openapi.json"]);
  });

  it("reads the URL when a check runs, so a server can start after registration", async () => {
    const late: BackendTarget = { ...target(), url: "" };
    const checks = collect(late);
    late.url = "https://shop.example/api/consent/";
    await expect(checks.get("serves its OpenAPI document")?.()).resolves.toBeUndefined();
  });
});
