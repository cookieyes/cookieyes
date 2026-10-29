import type { ConformanceRunner } from "./conformance.js";

/**
 * The version of the consent backend contract this suite checks. A backend that
 * passes can say it conforms to this version.
 */
export const BACKEND_CONTRACT_VERSION = 1;

/** The server under test. */
export type BackendTarget = {
  /** The backend's base URL, including its base path: `https://example.com/api/consent`. */
  url: string;
  /** An origin the server trusts, as configured on it. */
  trustedOrigin: string;
  /** An origin the server does not trust. Default `https://untrusted.invalid`. */
  untrustedOrigin?: string | undefined;
  /**
   * An owner key. Without one, the lookup, export, delete and prune checks are skipped,
   * and the records the suite saves stay in the database.
   */
  apiKey?: string | undefined;
  /** Set `false` when the server is configured without the read-back route. */
  readBack?: boolean | undefined;
  /** Sends a request in place of the global `fetch`, for a server running in the same process. */
  fetch?: ((request: Request) => Promise<Response>) | undefined;
};

type Payload = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(`[backend conformance] ${message}`);
}

function check(condition: boolean, message: string): void {
  if (!condition) fail(message);
}

function newConsentId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(33));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .slice(0, 44);
}

let sequence = 0;

/** A record shaped exactly like the one `@cookieyes/core` sends. */
function decision(consentId: string, overrides: Payload = {}): Payload {
  sequence += 1;
  return {
    recordId: `${consentId}.${Date.now().toString(36)}${sequence.toString(36)}.conformance`,
    consentId,
    categories: { necessary: true, analytics: false, advertisement: false },
    regulation: "GDPR",
    domain: "conformance.example",
    decidedAt: new Date(Date.UTC(2026, 0, 1) + sequence * 1000).toISOString(),
    taxonomyHash: "conf01",
    action: "reject_all",
    source: "banner",
    sdkVersion: "0.0.0-conformance",
    gpc: false,
    ...overrides,
  };
}

/**
 * Checks that a server keeps the consent backend contract: records are stored once
 * however often they are sent, bodies are validated, only trusted origins get in,
 * and the owner routes need the owner key. It talks HTTP only, so it can check a
 * server written in any language.
 *
 * @example
 * runBackendConformance(
 *   { url: "http://localhost:3000/api/consent", trustedOrigin: "http://localhost:3000", apiKey },
 *   { describe, it },
 * );
 */
export function runBackendConformance(
  target: BackendTarget,
  { describe, it }: ConformanceRunner,
): void {
  const base = target.url.replace(/\/+$/, "");
  const untrusted = target.untrustedOrigin ?? "https://untrusted.invalid";

  const send = (path: string, init: RequestInit = {}): Promise<Response> => {
    const request = new Request(`${base}${path}`, init);
    return target.fetch ? target.fetch(request) : fetch(request);
  };
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    send("/", {
      method: "POST",
      headers: { "content-type": "application/json", origin: target.trustedOrigin, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const owner = (path: string, init: RequestInit = {}) =>
    send(path, {
      ...init,
      headers: { authorization: `Bearer ${target.apiKey}`, ...(init.headers ?? {}) },
    });
  const records = async (consentId: string): Promise<Payload[]> => {
    const response = await owner(`/consents/${encodeURIComponent(consentId)}`);
    check(response.status === 200, `owner lookup answered ${response.status}, expected 200`);
    return ((await response.json()) as { records: Payload[] }).records;
  };
  const forget = (consentId: string) =>
    owner(`/consents/${encodeURIComponent(consentId)}`, { method: "DELETE" });
  // With an owner key, every record the suite saves is deleted again.
  const tidy = async (consentId: string) => {
    if (target.apiKey) await forget(consentId);
  };
  const expectStatus = async (response: Response, expected: number, what: string) => {
    check(
      response.status === expected,
      `${what} answered ${response.status}, expected ${expected}`,
    );
    if (expected >= 400) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: unknown };
      } | null;
      check(
        typeof body?.error?.code === "string",
        `${what} must answer with { error: { code, message } }`,
      );
    }
  };

  describe("consent backend conformance: saving", () => {
    it("stores a new decision and answers 201", async () => {
      const consentId = newConsentId();
      const response = await post(decision(consentId));
      check(response.status === 201, `a new record answered ${response.status}, expected 201`);
      const body = (await response.json()) as { result?: unknown };
      check(body.result === "created", 'a new record must answer { result: "created" }');
      await tidy(consentId);
    });

    it("stores a decision sent ten times exactly once", async () => {
      const consentId = newConsentId();
      const record = decision(consentId);
      await expectStatus(await post(record), 201, "the first copy");
      for (let i = 0; i < 9; i++) await expectStatus(await post(record), 200, "a repeated copy");
      if (target.apiKey) {
        check((await records(consentId)).length === 1, "ten copies must leave one stored record");
        await forget(consentId);
      }
    });

    it("stores copies that arrive at the same moment exactly once", async () => {
      const consentId = newConsentId();
      const record = decision(consentId);
      const statuses = (await Promise.all(Array.from({ length: 5 }, () => post(record)))).map(
        (r) => r.status,
      );
      check(
        statuses.filter((s) => s === 201).length === 1 &&
          statuses.every((s) => s === 201 || s === 200),
        `simultaneous copies answered ${statuses.join(", ")}; expected one 201 and the rest 200`,
      );
      if (target.apiKey) {
        check((await records(consentId)).length === 1, "simultaneous copies must leave one record");
        await forget(consentId);
      }
    });

    it("refuses a different decision under a recordId already stored, with 409", async () => {
      const consentId = newConsentId();
      const record = decision(consentId);
      await expectStatus(await post(record), 201, "the first record");
      const changed = {
        ...record,
        categories: { necessary: true, analytics: true, advertisement: false },
      };
      await expectStatus(await post(changed), 409, "a different decision under the same recordId");
      await tidy(consentId);
    });

    it("refuses a record without a recordId, with 422", async () => {
      const { recordId: _omitted, ...rest } = decision(newConsentId());
      await expectStatus(await post(rest), 422, "a record without recordId");
    });

    it("refuses a record that breaks the contract, with 422", async () => {
      await expectStatus(
        await post(decision(newConsentId(), { regulation: "NOT_A_REGULATION" })),
        422,
        "an unknown regulation",
      );
      await expectStatus(
        await post(decision(newConsentId(), { categories: { analytics: "yes" } })),
        422,
        "a category that is not true or false",
      );
      await expectStatus(
        await post(decision(newConsentId(), { decidedAt: "yesterday" })),
        422,
        "a decidedAt that is not a date",
      );
    });

    it("refuses a body that is not JSON, with 400", async () => {
      await expectStatus(await post("{not json"), 400, "a malformed body");
    });

    it("refuses a body not sent as JSON, with 415", async () => {
      await expectStatus(
        await post(decision(newConsentId()), { "content-type": "text/plain" }),
        415,
        "a text/plain body",
      );
    });

    it("refuses a body over 4 KB, with 413", async () => {
      await expectStatus(
        await post(decision(newConsentId(), { padding: "x".repeat(5000) })),
        413,
        "a 5 KB body",
      );
    });

    it("accepts a field it does not know, and does not store it", async () => {
      const consentId = newConsentId();
      await expectStatus(
        await post(decision(consentId, { fieldFromANewerSdk: "value" })),
        201,
        "a record with an unknown field",
      );
      if (target.apiKey) {
        const [stored] = await records(consentId);
        check(
          stored !== undefined && !("fieldFromANewerSdk" in stored),
          "unknown fields must not be stored",
        );
        await forget(consentId);
      }
    });
  });

  describe("consent backend conformance: origins", () => {
    it("answers a preflight from a trusted origin", async () => {
      const response = await send("/", {
        method: "OPTIONS",
        headers: {
          origin: target.trustedOrigin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type, authorization",
        },
      });
      check(
        response.status === 204 || response.status === 200,
        `preflight answered ${response.status}`,
      );
      check(
        response.headers.get("access-control-allow-origin") === target.trustedOrigin,
        "a trusted preflight must allow that origin",
      );
      const allowed = (response.headers.get("access-control-allow-headers") ?? "").toLowerCase();
      check(
        allowed.includes("content-type") && allowed.includes("authorization"),
        "a preflight must allow Content-Type and Authorization, which the SDK sends",
      );
    });

    it("lets a trusted origin read the answer to a save", async () => {
      const consentId = newConsentId();
      const response = await post(decision(consentId));
      check(
        response.headers.get("access-control-allow-origin") === target.trustedOrigin,
        "a save from a trusted origin must carry Access-Control-Allow-Origin",
      );
      await tidy(consentId);
    });

    it("refuses a save from an origin it does not trust, with 403", async () => {
      const response = await post(decision(newConsentId()), { origin: untrusted });
      await expectStatus(response, 403, "a save from an untrusted origin");
      check(
        response.headers.get("access-control-allow-origin") === null,
        "an untrusted origin must not be allowed",
      );
    });
  });

  describe("consent backend conformance: reading", () => {
    it(`reports itself on /status with contract ${BACKEND_CONTRACT_VERSION}`, async () => {
      const response = await send("/status");
      await expectStatus(response, 200, "/status");
      const body = (await response.json()) as { contract?: unknown; version?: unknown };
      check(
        body.contract === BACKEND_CONTRACT_VERSION,
        `/status must report contract ${BACKEND_CONTRACT_VERSION}`,
      );
      check(typeof body.version === "string", "/status must report a version");
    });

    it("serves its OpenAPI document", async () => {
      const response = await send("/openapi.json");
      await expectStatus(response, 200, "/openapi.json");
      const body = (await response.json()) as { openapi?: unknown };
      check(typeof body.openapi === "string" && body.openapi.startsWith("3."), "must be OpenAPI 3");
    });

    if (target.readBack !== false) {
      it("returns a visitor's latest decision, without the IP address", async () => {
        const consentId = newConsentId();
        await post(decision(consentId, { action: "reject_all" }));
        const latest = decision(consentId, {
          action: "accept_all",
          categories: { necessary: true, analytics: true, advertisement: true },
        });
        await post(latest);
        const response = await send(`/consents/${encodeURIComponent(consentId)}/current`, {
          headers: { origin: target.trustedOrigin },
        });
        await expectStatus(response, 200, "reading the current decision");
        const { record } = (await response.json()) as { record: Payload };
        check(record.recordId === latest.recordId, "the current decision must be the latest one");
        check(!("ip" in record), "the public read must never include the IP address");
        if (target.apiKey) await forget(consentId);
      });

      it("answers 404 for a visitor with no decision", async () => {
        await expectStatus(
          await send(`/consents/${newConsentId()}/current`),
          404,
          "an unknown visitor",
        );
      });
    }
  });

  describe("consent backend conformance: owner routes", () => {
    it("refuses the owner routes without the owner key, with 401", async () => {
      const consentId = newConsentId();
      await expectStatus(await send(`/consents/${consentId}`), 401, "a lookup with no key");
      await expectStatus(
        await send(`/consents/${consentId}`, { headers: { authorization: "Bearer wrong-key" } }),
        401,
        "a lookup with a wrong key",
      );
      await expectStatus(
        await send(`/consents/${consentId}`, { method: "DELETE" }),
        401,
        "a delete with no key",
      );
      await expectStatus(await send("/prune", { method: "POST" }), 401, "a prune with no key");
    });

    if (target.apiKey) {
      it("returns every record for a visitor, oldest first", async () => {
        const consentId = newConsentId();
        const first = decision(consentId);
        const second = decision(consentId, { action: "accept_all" });
        await post(first);
        await post(second);
        const stored = await records(consentId);
        check(stored.length === 2, `expected 2 records, found ${stored.length}`);
        check(stored[0]?.recordId === first.recordId, "records must be oldest first");
        check(
          Array.isArray(stored[0]?.granted) && Array.isArray(stored[0]?.denied),
          "a stored record lists granted and denied categories",
        );
        await forget(consentId);
      });

      it("exports a visitor's records as CSV", async () => {
        const consentId = newConsentId();
        await post(decision(consentId));
        const response = await owner(`/consents/${encodeURIComponent(consentId)}?format=csv`);
        check(response.status === 200, `CSV export answered ${response.status}`);
        check(
          (response.headers.get("content-type") ?? "").startsWith("text/csv"),
          "CSV must be text/csv",
        );
        check(
          (await response.text()).trim().split(/\r?\n/).length === 2,
          "CSV must have a header and one row",
        );
        await forget(consentId);
      });

      it("deletes every record for a visitor and says how many", async () => {
        const consentId = newConsentId();
        await post(decision(consentId));
        await post(decision(consentId, { action: "accept_all" }));
        const response = await forget(consentId);
        await expectStatus(response, 200, "a delete");
        const { deleted } = (await response.json()) as { deleted: unknown };
        check(deleted === 2, `a delete must report 2 records, reported ${String(deleted)}`);
        check((await records(consentId)).length === 0, "deleted records must be gone");
        if (target.readBack !== false) {
          await expectStatus(
            await send(`/consents/${consentId}/current`),
            404,
            "reading a deleted visitor",
          );
        }
      });

      it("prunes on request and says how many", async () => {
        const response = await owner("/prune", { method: "POST" });
        await expectStatus(response, 200, "a prune");
        const { deleted } = (await response.json()) as { deleted: unknown };
        check(Number.isInteger(deleted), "a prune must report how many records it deleted");
      });
    }
  });
}
