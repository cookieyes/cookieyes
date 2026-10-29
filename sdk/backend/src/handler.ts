import {
  CONTRACT_VERSION,
  isConsentId,
  MAX_BODY_BYTES,
  toStoredRecord,
  validatePayload,
} from "./contract.js";
import { recordsToCsv } from "./csv.js";
import { renderDocsPage } from "./docs-page.js";
import { clientIp, DEFAULT_IP_HEADERS, hashIp, truncateIp } from "./ip.js";
import { buildOpenApi } from "./openapi.js";
import { createMemoryRateLimiter, type RateLimiter } from "./rate-limit.js";
import type { ConsentStore, MigrationReport, StoredRecord } from "./store.js";
import { BACKEND_VERSION } from "./version.js";

/** Below this, a record could be pruned while the visitor's cookie, valid a year, still holds it. */
const MIN_RETENTION_MONTHS = 12;
const MIN_API_KEY_LENGTH = 32;

/** Something worth knowing happened. Never carries a visitor id, a payload or an address. */
export type LogEntry = {
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  count?: number | undefined;
};

/** Options for {@link createConsentBackend}. Only `database` and `trustedOrigins` are required. */
export type ConsentBackendOptions = {
  /** Where records are kept: `postgresStore`, `sqliteStore`, `d1Store` or `memoryStore`. */
  database: ConsentStore;
  /**
   * Origins whose pages may send records, like `https://shop.example.com`. A leading
   * `*.` in the host (`https://*.example.com`) matches its subdomains.
   */
  trustedOrigins: readonly string[];
  /** The path the handler is mounted at, like `/api/consent`. Default: the root. */
  basePath?: string | undefined;
  /**
   * Keys for the owner routes (lookup, delete, prune), sent as `Authorization: Bearer`.
   * At least 32 characters each. Without one, those routes always answer 401.
   */
  apiKeys?: readonly string[] | undefined;
  /** How long records are kept before `prune()` deletes them. Default 24, minimum 12. */
  retentionMonths?: number | undefined;
  /** Serve `GET /consents/:consentId/current`. Default `true`. */
  readBack?: boolean | undefined;
  /** Store a reduced form of the visitor's IP address. Off by default. */
  ipAddress?:
    | {
        /** `"truncated"` keeps the network (/24 or /48); `"hashed"` keeps a keyed hash. */
        store: "truncated" | "hashed";
        /** Required for `"hashed"`: at least 32 characters, kept out of the database. */
        secret?: string | undefined;
        /** Request headers that carry the address, first match wins. */
        headers?: readonly string[] | undefined;
      }
    | undefined;
  /** Requests per visitor and per client address in each window. `false` turns it off. */
  rateLimit?:
    | false
    | {
        perVisitor?: number | undefined;
        perClient?: number | undefined;
        windowMs?: number | undefined;
        /** A shared limiter for servers with many instances. Default: in this process. */
        limiter?: RateLimiter | undefined;
      }
    | undefined;
  /** Where log entries go. Default: the console. */
  log?: ((entry: LogEntry) => void) | undefined;
};

/** A running consent backend: a request handler plus the jobs you schedule. */
export type ConsentBackend = {
  /** Answers one request. Mount it on every method under `basePath`. */
  handler: (request: Request) => Promise<Response>;
  /** The handler under each method name, for frameworks that export one per method. */
  routes: Record<"GET" | "POST" | "DELETE" | "OPTIONS", (request: Request) => Promise<Response>>;
  /** Create or upgrade the tables. `dryRun` only reports what would change. */
  migrate: (options?: { dryRun?: boolean | undefined }) => Promise<MigrationReport>;
  /** Delete records older than `retentionMonths`; returns how many. */
  prune: () => Promise<number>;
};

type Origin = { protocol: string; host: string; wildcard: boolean; port: string };

function parseOrigin(pattern: string): Origin {
  const wildcard = /^[a-z]+:\/\/\*\./i.test(pattern);
  let url: URL;
  try {
    url = new URL(wildcard ? pattern.replace("*.", "") : pattern);
  } catch {
    throw new TypeError(
      `[cookieyes-backend] trustedOrigins: "${pattern}" is not an origin like https://example.com.`,
    );
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username) {
    throw new TypeError(
      `[cookieyes-backend] trustedOrigins: "${pattern}" must be an origin only, with no path.`,
    );
  }
  return { protocol: url.protocol, host: url.hostname, wildcard, port: url.port };
}

function matchesOrigin(origin: string, allowed: readonly Origin[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return allowed.some(
    (o) =>
      o.protocol === url.protocol &&
      o.port === url.port &&
      (o.wildcard ? url.hostname.endsWith(`.${o.host}`) : url.hostname === o.host),
  );
}

// Compares every character whatever the input, so timing does not reveal a prefix.
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    // A missing or false Content-Length must not let a large body through.
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

// Same headers, same order as `GEO_HEADERS` in @cookieyes/core's region.ts, so
// /status reports the region the SDK would detect on this host.
function callerRegion(headers: Headers): string | null {
  const country = headers.get("x-vercel-ip-country");
  if (country) {
    const region = headers.get("x-vercel-ip-country-region");
    return region ? `${country}-${region}` : country;
  }
  return headers.get("cf-ipcountry");
}

function defaultLog(entry: LogEntry): void {
  const line = `[cookieyes-backend] ${entry.message}`;
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.info(line);
}

const publicView = ({ ip: _ip, ...rest }: StoredRecord) => rest;

/**
 * Create a consent backend. Mount `handler` on every method under `basePath`, run
 * `migrate()` once, and point the SDK at it with `mode: "self-hosted"` and
 * `apiUrl: basePath`.
 *
 * @example
 * export const backend = createConsentBackend({
 *   basePath: "/api/consent",
 *   trustedOrigins: ["https://shop.example.com"],
 *   database: postgresStore(new Pool({ connectionString: process.env.DATABASE_URL })),
 * });
 */
export function createConsentBackend(options: ConsentBackendOptions): ConsentBackend {
  const { database } = options;
  if (!database || typeof database.save !== "function") {
    throw new TypeError("[cookieyes-backend] database: pass a store such as postgresStore(pool).");
  }
  if (!Array.isArray(options.trustedOrigins)) {
    throw new TypeError("[cookieyes-backend] trustedOrigins: pass the origins of your site.");
  }
  const origins = options.trustedOrigins.map(parseOrigin);
  const basePath = (options.basePath ?? "").replace(/\/+$/, "");
  if (basePath && !basePath.startsWith("/")) {
    throw new TypeError(`[cookieyes-backend] basePath: "${basePath}" must start with "/".`);
  }
  const apiKeys = options.apiKeys ?? [];
  if (apiKeys.some((k) => typeof k !== "string" || k.length < MIN_API_KEY_LENGTH)) {
    throw new TypeError(
      `[cookieyes-backend] apiKeys: each key needs at least ${MIN_API_KEY_LENGTH} characters, for example from \`openssl rand -hex 32\`.`,
    );
  }
  const retentionMonths = options.retentionMonths ?? 24;
  if (!Number.isInteger(retentionMonths) || retentionMonths < MIN_RETENTION_MONTHS) {
    throw new TypeError(
      `[cookieyes-backend] retentionMonths: use a whole number of at least ${MIN_RETENTION_MONTHS}, the lifetime of the consent cookie.`,
    );
  }
  const ipOptions = options.ipAddress;
  if (ipOptions?.store === "hashed" && (ipOptions.secret?.length ?? 0) < MIN_API_KEY_LENGTH) {
    throw new TypeError(
      `[cookieyes-backend] ipAddress.secret: "hashed" needs a secret of at least ${MIN_API_KEY_LENGTH} characters.`,
    );
  }
  const ipHeaders = ipOptions?.headers ?? DEFAULT_IP_HEADERS;
  const readBack = options.readBack ?? true;
  const limits =
    options.rateLimit === false
      ? null
      : {
          perVisitor: options.rateLimit?.perVisitor ?? 10,
          perClient: options.rateLimit?.perClient ?? 120,
          windowMs: options.rateLimit?.windowMs ?? 60_000,
          limiter: options.rateLimit?.limiter ?? createMemoryRateLimiter(),
        };
  const log = options.log ?? defaultLog;
  const openapi = buildOpenApi(basePath);
  const openapiText = JSON.stringify(openapi);
  const docsPage = renderDocsPage(openapi, basePath);
  let warnedKeyInBrowser = false;

  const json = (status: number, body: unknown, headers: HeadersInit = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
    });
  const fail = (status: number, code: string, message: string, headers: HeadersInit = {}) =>
    json(status, { error: { code, message } }, headers);

  const corsHeaders = (origin: string | null): Record<string, string> =>
    origin && matchesOrigin(origin, origins)
      ? { "access-control-allow-origin": origin, vary: "Origin" }
      : { vary: "Origin" };

  const isOwner = (request: Request) => {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    let match = false;
    for (const key of apiKeys) match = safeEqual(token, key) || match;
    return match;
  };

  const overLimit = async (key: string, limit: number) =>
    limits !== null && !(await limits.limiter(key, limit, limits.windowMs));
  const tooMany = (cors: Record<string, string>) =>
    fail(429, "rate_limited", "Too many requests. Try again shortly.", {
      ...cors,
      "retry-after": String(Math.ceil((limits?.windowMs ?? 60_000) / 1000)),
    });

  async function storedIp(request: Request): Promise<string | null> {
    if (!ipOptions) return null;
    const ip = clientIp(request.headers, ipHeaders);
    if (!ip) return null;
    if (ipOptions.store === "truncated") return truncateIp(ip);
    return hashIp(ip, ipOptions.secret as string);
  }

  async function save(request: Request, cors: Record<string, string>): Promise<Response> {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return fail(415, "unsupported_media_type", "Send the record as application/json.", cors);
    }
    const text = await readBody(request);
    if (text === null) {
      return fail(413, "payload_too_large", `The body is over ${MAX_BODY_BYTES} bytes.`, cors);
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json", "The body is not valid JSON.", cors);
    }
    const result = validatePayload(body);
    if (!result.ok) return fail(422, result.error.code, result.error.message, cors);
    const payload = result.value;
    if (await overLimit(`visitor:${payload.consentId}`, limits?.perVisitor ?? 0)) {
      return tooMany(cors);
    }
    // The SDK's `apiKey` is visible to anyone who views the page source. If it equals an
    // owner key, that key is public and must be replaced.
    if (!warnedKeyInBrowser && apiKeys.length > 0 && isOwner(request)) {
      warnedKeyInBrowser = true;
      log({
        level: "warn",
        event: "owner_key_exposed",
        message:
          "A browser sent one of your apiKeys with a consent record. Anyone can read it from your page: replace that key, and never use it as the SDK's apiKey.",
      });
    }
    const record = toStoredRecord(payload, new Date(), await storedIp(request));
    const outcome = await database.save(record);
    if (outcome === "conflict") {
      return fail(
        409,
        "record_conflict",
        "This recordId is already stored with a different decision.",
        cors,
      );
    }
    return json(
      outcome === "created" ? 201 : 200,
      { recordId: record.recordId, result: outcome },
      cors,
    );
  }

  async function status(request: Request): Promise<Response> {
    let schema: "current" | "pending" | "unknown" = "unknown";
    let reachable = true;
    try {
      schema = await database.check();
    } catch (error) {
      reachable = false;
      log({
        level: "error",
        event: "database_unreachable",
        message: `Status check could not reach the database: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    const ok = reachable && schema === "current";
    const language = request.headers.get("accept-language")?.split(/[,;]/)[0]?.trim() || null;
    return json(ok ? 200 : 503, {
      status: ok ? "ok" : "unavailable",
      version: BACKEND_VERSION,
      contract: CONTRACT_VERSION,
      time: new Date().toISOString(),
      database: reachable ? "ok" : "unreachable",
      schema,
      caller: { region: callerRegion(request.headers), language },
    });
  }

  async function owner(request: Request, method: string, consentId: string): Promise<Response> {
    if (apiKeys.length === 0) {
      return fail(401, "owner_routes_disabled", "No apiKeys are configured on this server.");
    }
    if (!isOwner(request)) return fail(401, "unauthorized", "The owner key is missing or wrong.");
    if (method === "DELETE") {
      const deleted = await database.remove(consentId);
      log({
        level: "info",
        event: "records_deleted",
        message: `Deleted ${deleted} records for one visitor.`,
        count: deleted,
      });
      return json(200, { deleted });
    }
    const records = await database.list(consentId);
    const url = new URL(request.url);
    const wantsCsv =
      url.searchParams.get("format") === "csv" ||
      (request.headers.get("accept") ?? "").includes("text/csv");
    if (wantsCsv) {
      return new Response(recordsToCsv(records), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="consent-records.csv"',
          "cache-control": "no-store",
        },
      });
    }
    return json(200, { records });
  }

  async function prune(): Promise<number> {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);
    const deleted = await database.prune(cutoff);
    log({
      level: "info",
      event: "records_pruned",
      message: `Pruned ${deleted} records received before ${cutoff.toISOString()}.`,
      count: deleted,
    });
    return deleted;
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      return fail(404, "not_found", "No such route.");
    }
    const path = url.pathname.slice(basePath.length).replace(/\/+$/, "") || "/";
    const method = request.method.toUpperCase();
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);
    const trusted = "access-control-allow-origin" in cors;
    const notAllowed = (allow: string) =>
      fail(405, "method_not_allowed", `Use ${allow}.`, { ...cors, allow });

    if (method === "OPTIONS") {
      if (!trusted) return fail(403, "origin_not_allowed", "This origin is not trusted.", cors);
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "access-control-allow-methods": "GET, POST",
          // The SDK sends Authorization when the site sets `apiKey`.
          "access-control-allow-headers": "Content-Type, Authorization",
          "access-control-max-age": "600",
        },
      });
    }

    // A browser always names its origin on a cross-origin request, and a page can't
    // forge it. A request without one comes from a server, which CORS does not govern.
    const browserBlocked = origin !== null && !trusted;
    const client = clientIp(request.headers, ipHeaders);

    if (path === "/") {
      if (method !== "POST") return notAllowed("POST");
      if (browserBlocked)
        return fail(403, "origin_not_allowed", "This origin is not trusted.", cors);
      if (client && (await overLimit(`client:${client}`, limits?.perClient ?? 0))) {
        return tooMany(cors);
      }
      return save(request, cors);
    }
    if (path === "/status") {
      return method === "GET" ? status(request) : notAllowed("GET");
    }
    if (path === "/openapi.json") {
      if (method !== "GET") return notAllowed("GET");
      return new Response(openapiText, {
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
      });
    }
    if (path === "/docs") {
      if (method !== "GET") return notAllowed("GET");
      return new Response(docsPage, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
        },
      });
    }
    if (path === "/prune") {
      if (method !== "POST") return notAllowed("POST");
      if (apiKeys.length === 0) {
        return fail(401, "owner_routes_disabled", "No apiKeys are configured on this server.");
      }
      if (!isOwner(request)) return fail(401, "unauthorized", "The owner key is missing or wrong.");
      return json(200, { deleted: await prune() });
    }

    const match = /^\/consents\/([^/]+)(\/current)?$/.exec(path);
    let consentId = "";
    try {
      consentId = decodeURIComponent(match?.[1] ?? "");
    } catch {
      // A malformed escape falls through to the not-found answer below.
    }
    if (match && isConsentId(consentId)) {
      if (match[2]) {
        if (!readBack) return fail(404, "not_found", "No such route.", cors);
        if (method !== "GET") return notAllowed("GET");
        if (browserBlocked) {
          return fail(403, "origin_not_allowed", "This origin is not trusted.", cors);
        }
        if (client && (await overLimit(`client:${client}`, limits?.perClient ?? 0))) {
          return tooMany(cors);
        }
        const record = await database.current(consentId);
        return record
          ? json(200, { record: publicView(record) }, cors)
          : fail(404, "not_found", "No decision is stored for this visitor.", cors);
      }
      if (method !== "GET" && method !== "DELETE") return notAllowed("GET, DELETE");
      return owner(request, method, consentId);
    }
    return fail(404, "not_found", "No such route.", cors);
  }

  async function handler(request: Request): Promise<Response> {
    try {
      return await route(request);
    } catch (error) {
      // The message only: a driver's error object can carry the values it was given.
      log({
        level: "error",
        event: "request_failed",
        message: `A request failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return json(500, {
        error: { code: "internal_error", message: "The server could not complete the request." },
      });
    }
  }

  return {
    handler,
    routes: { GET: handler, POST: handler, DELETE: handler, OPTIONS: handler },
    migrate: (migrateOptions) => database.migrate(migrateOptions),
    prune,
  };
}
