# Consent backend

`@cookieyes/backend` stores the record the SDK sends for each consent decision. A stored record
is evidence a site may have to show a regulator, so these guarantees matter more than its
features. Each one is pinned by a test; read it before changing the code it covers.

## One decision, one row

The SDK resends a record until it gets a 2xx (`sdk/core/src/record-queue.ts`), with the same
`recordId` every time. The backend stores it once because the insert is
`INSERT ... ON CONFLICT (record_id) DO NOTHING RETURNING`: the database's unique key decides.

A read before the write ("is it there? if not, insert") looks equivalent and is not: two copies
arriving together both read "not there" and both insert, or one fails on the key and answers 500,
which the SDK retries. `store.test.ts` sends ten copies at once and expects one `created`; on
PGlite the race cannot happen, so CI runs the same test against a real Postgres
(`COOKIEYES_TEST_PG_URL`).

A different body under a known `recordId` is refused with 409 and the first row kept. Comparing
bodies leaves out `receivedAt` and `ip` (`_sameDecision` in `store.ts`): a retry arrives later
and possibly from another network.

## The contract cannot drift from the SDK

`PAYLOAD_FIELDS` in `contract.ts` is the one list the validator, the OpenAPI document, the `/docs`
page and the docs site read. `contract.test.ts` builds a real record with `createConsentManager`
from `@cookieyes/core` and fails if its fields and the list differ. A new field in the SDK's
payload therefore fails the backend's tests until the contract names it.

`openapi.json` is generated from the source and committed, because other implementers read it.
`openapi.test.ts` compares it parsed, not as text, since Biome reformats it. Regenerate with
`UPDATE_OPENAPI=1 pnpm --filter @cookieyes/backend test`, then `pnpm lint:fix`.

## Unknown fields are dropped, not refused

Refusing unknown fields looks stricter and is worse: when the SDK adds a field, every backend
already deployed would refuse every record from the newer SDK, and those records are lost when
the browser's 7-day retry window ends. So unknown fields are ignored and never stored, and the
4 KB body limit bounds what an attacker can send.

## Minimal data by default

- No IP address unless `ipAddress` is set, and then only truncated (a /24 or /48) or an HMAC.
  There is no option for a raw address, on purpose.
- No page URL, referrer, user agent or cookie is read into the record.
- Log entries (`LogEntry`) carry an event and a count, never a consent id, payload or address.
  A database error is logged by message only: a driver's error object can carry the values it was
  given.
- The public read route never returns `ip` (`publicView` in `handler.ts`).

## Retention cannot undercut the cookie

`retentionMonths` has a minimum of 12, the consent cookie's lifetime. Below it, `prune()` could
delete a visitor's current decision while their cookie still applies it, leaving a choice in
force with no record behind it. Age is counted from `received_at`, the server's clock, so a
visitor's clock cannot move a record in or out of retention.

## Never on the path to the banner

The backend adds nothing to `core`, `react`, `nextjs` or `vanilla`, and the SDK only writes to it
after a decision. `sdk/react/src/__tests__/no-network-on-load.test.tsx` keeps cookie-only mode at
zero requests. Reading a decision back from the backend is a separate, opt-in step and must stay
off the first paint (see [banner-first-paint.md](./banner-first-paint.md)).

## Migrations without transactions

A pooled Postgres client does not promise that `BEGIN` and the statements after it reach the
same connection, so migrations run without a transaction. Every statement is idempotent
(`CREATE ... IF NOT EXISTS`, ledger insert `ON CONFLICT DO NOTHING`), so a run that stopped
halfway, or two instances migrating at once, finish cleanly when run again. A future migration
must keep that property.
