import type { BackendSidecarEntry } from "@/lib/backend-reference-types";

/**
 * Prose for every `createConsentBackend()` option. The names and types come from
 * `ConsentBackendOptions` in `sdk/backend/src/handler.ts`; `generate-backend-reference.mjs`
 * fails the build when an option has no entry here, or an entry here has no option.
 * Each `defaultLocation` points at the line that applies the default.
 */
export const backendOptionSidecarEntries: BackendSidecarEntry[] = [
  {
    path: "database",
    description:
      "Where records are kept: `postgresStore(client)`, `sqliteStore(db)`, `d1Store(env.DB)` or `memoryStore()`.",
    default: null,
    defaultLocation: null,
  },
  {
    path: "trustedOrigins",
    description:
      "Origins whose pages may send records, like `https://shop.example.com`. `https://*.example.com` matches subdomains. A browser on any other origin gets 403.",
    default: null,
    defaultLocation: null,
  },
  {
    path: "basePath",
    description: "The path the handler is mounted at. Point the SDK's `apiUrl` at the same path.",
    default: "the root",
    defaultLocation: "backend/handler.ts:206",
  },
  {
    path: "apiKeys",
    description:
      "Keys for the owner routes (lookup, export, delete, prune), sent as `Authorization: Bearer <key>`. At least 32 characters each.",
    default: "none: owner routes answer 401",
    defaultLocation: "backend/handler.ts:210",
  },
  {
    path: "retentionMonths",
    description:
      "How long a record is kept before `prune()` deletes it. At least 12, the lifetime of the consent cookie.",
    default: "24",
    defaultLocation: "backend/handler.ts:216",
  },
  {
    path: "readBack",
    description: "Serve `GET /consents/:consentId/current`. Set `false` for a write-only backend.",
    default: "true",
    defaultLocation: "backend/handler.ts:229",
  },
  {
    path: "ipAddress",
    description: "Store a reduced form of the visitor's IP address. Leave it out to store none.",
    default: "not stored",
    defaultLocation: null,
  },
  {
    path: "ipAddress.store",
    description:
      '`"truncated"` keeps the network only (a /24 or /48). `"hashed"` keeps a keyed hash. A raw address is never stored.',
    default: null,
    defaultLocation: null,
  },
  {
    path: "ipAddress.secret",
    description: 'The key for `"hashed"`, at least 32 characters. Keep it out of the database.',
    default: null,
    defaultLocation: null,
  },
  {
    path: "ipAddress.headers",
    description: "Request headers that carry the visitor's address, first match wins.",
    default: "cf-connecting-ip, x-real-ip, x-forwarded-for",
    defaultLocation: "backend/ip.ts:2",
  },
  {
    path: "rateLimit",
    description: "Limits per visitor and per client address. `false` turns limiting off.",
    default: "on",
    defaultLocation: "backend/handler.ts:230",
  },
  {
    path: "rateLimit.perVisitor",
    description: "Saves one consent id may make in each window.",
    default: "10",
    defaultLocation: "backend/handler.ts:234",
  },
  {
    path: "rateLimit.perClient",
    description: "Requests one client address may make in each window.",
    default: "120",
    defaultLocation: "backend/handler.ts:235",
  },
  {
    path: "rateLimit.windowMs",
    description: "Length of a window, in milliseconds.",
    default: "60000",
    defaultLocation: "backend/handler.ts:236",
  },
  {
    path: "rateLimit.limiter",
    description:
      "A shared limiter, such as one backed by Redis or Cloudflare KV, for a backend that runs as several instances.",
    default: "in this process",
    defaultLocation: "backend/handler.ts:237",
  },
  {
    path: "log",
    description:
      "Receives log entries. They say what happened, never who it happened to: no consent id, payload or address.",
    default: "the console",
    defaultLocation: "backend/handler.ts:239",
  },
];
