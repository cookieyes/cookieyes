---
"@cookieyes/backend": minor
---

New: `@cookieyes/backend`, a consent server you run yourself. Self-hosted mode now has somewhere to send its records: install it, point it at your database, mount one handler, and every consent decision is stored once as proof.

**`createConsentBackend({ basePath, trustedOrigins, database })`.** Returns a web-standard `handler(request)` that mounts in Next.js, Hono, Bun, Deno and Cloudflare Workers as it is, and in Express, Fastify and `node:http` through `toNodeHandler()` from `@cookieyes/backend/node`. Point the SDK at it with `mode: "self-hosted"` and `apiUrl`. It works with every SDK version from `@cookieyes/core` 0.9.0, which added the record id it uses to store each decision once.

**Your database, your client.** `postgresStore()` takes any client with `query(text, params)`, such as `pg`, postgres.js or Neon. `sqliteStore()` takes `node:sqlite`, `better-sqlite3` or `bun:sqlite`, and `d1Store()` a Cloudflare D1 binding. The package has no runtime dependencies. Create the table with `npx cookieyes-backend migrate --apply`, or `backend.migrate()`.

**Stored once, kept minimal.** A retried record is stored once, even when copies arrive at the same moment, and a different decision under a known id is refused with 409. Each row holds when, what the visitor saw and chose, and where. No IP address is stored unless you turn on `ipAddress`, and then only truncated or hashed. Unknown fields are dropped, and logs never name a visitor.

**Safe in public.** Only `trustedOrigins` may save from a browser. Bodies are validated and limited to 4 KB, and requests are rate limited per visitor and per client address.

**Data requests and retention.** With `apiKeys` set, the owner routes look up a visitor's records as JSON or CSV, delete them, and prune records older than `retentionMonths` (24 by default). `/status` reports whether the server and its database are ready, and `/openapi.json` and `/docs` describe the contract.
