<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner, whose decisions @cookieyes/backend stores" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/backend</h1>

<p align="center"><strong>Store every consent decision on your own infrastructure, in fifteen minutes.</strong></p>

<p align="center">A self-hosted consent server for the CookieYes SDK. It receives the record the SDK sends for each decision, stores it once in your own database, and lets you show it, export it or delete it later.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/backend"><img src="https://img.shields.io/npm/v/@cookieyes/backend" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/backend"><img src="https://img.shields.io/npm/dw/@cookieyes/backend" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/backend" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#entry-points">Entry points</a> ·
  <a href="#routes">Routes</a> ·
  <a href="https://developers.cookieyes.com/docs/nextjs/self-host/quickstart">Docs</a>
</p>

---

- **Runs anywhere** that speaks web `Request` and `Response`: Next.js, Hono, Bun, Deno, Cloudflare Workers, and Express, Fastify or `node:http` through `toNodeHandler()`.
- **No runtime dependencies.** You pass the database client you already use: `pg`, postgres.js, Neon, `node:sqlite`, `better-sqlite3`, `bun:sqlite` or Cloudflare D1.
- **Stores each decision once**, however often a retry sends it, decided by the database's unique key.
- **No raw IP addresses**, no page URLs, no user agents. Logs carry no visitor ids.
- **Data subject requests and retention** built in: look up, export as CSV, delete, prune.
- **Safe as a public endpoint:** trusted origins only, validated and size-limited bodies, rate limiting.

You don't need it for `mode: "cookie-only"`, which stores the choice in the visitor's cookie and sends nothing.

## Quick start

```bash
npm install @cookieyes/backend
```

```ts
// lib/consent-backend.ts
import { createConsentBackend } from "@cookieyes/backend";
import { postgresStore } from "@cookieyes/backend/postgres";
import { Pool } from "pg";

export const backend = createConsentBackend({
  basePath: "/api/consent",
  trustedOrigins: ["https://shop.example.com"],
  database: postgresStore(new Pool({ connectionString: process.env.DATABASE_URL })),
  apiKeys: [process.env.CONSENT_OWNER_KEY], // for lookup, delete and prune
});
export default backend;
```

```ts
// app/api/consent/[[...path]]/route.ts (Next.js)
import { backend } from "../../../../lib/consent-backend";

export const { GET, POST, DELETE, OPTIONS } = backend.routes;
```

```bash
npx cookieyes-backend migrate --config ./lib/consent-backend.ts           # shows the plan
npx cookieyes-backend migrate --config ./lib/consent-backend.ts --apply   # creates the table
```

Then point the SDK at it, and open `/api/consent/status` to check it is live:

```ts
initCookieYes({ mode: "self-hosted", apiUrl: "/api/consent" });
```

## Entry points

| Import | Exports |
| --- | --- |
| `@cookieyes/backend` | `createConsentBackend`, `CONTRACT_VERSION`, `PAYLOAD_FIELDS`, `RECORD_FIELDS`, types |
| `@cookieyes/backend/postgres` | `postgresStore(client)` |
| `@cookieyes/backend/sqlite` | `sqliteStore(db)`, `d1Store(binding)` |
| `@cookieyes/backend/memory` | `memoryStore()`, for tests |
| `@cookieyes/backend/node` | `toNodeHandler(handler)`, for Express, Fastify and `node:http` |

## Routes

| Route | Access | |
| --- | --- | --- |
| `POST /` | Public | Save a decision: 201 new, 200 already stored, 409 a different decision under the same id |
| `GET /consents/:consentId/current` | Public | The visitor's latest decision (`readBack: false` turns it off) |
| `GET /status` | Public | Version, contract, database state, and the caller's region and language |
| `GET /openapi.json`, `GET /docs` | Public | The contract |
| `GET /consents/:consentId` | Owner key | Every record for the visitor, as JSON or CSV |
| `DELETE /consents/:consentId` | Owner key | Delete them all |
| `POST /prune` | Owner key | Delete records older than `retentionMonths` (default 24) |

The contract is [`openapi.json`](./openapi.json). Any server that passes the conformance suite in `@cookieyes/test/backend` is compatible with the SDK.

## Documentation

[developers.cookieyes.com/docs/self-host/quickstart](https://developers.cookieyes.com/docs/nextjs/self-host/quickstart): databases, mounting in each framework, what gets stored and why, retention, data subject requests, and the security checklist.

## License

MIT
