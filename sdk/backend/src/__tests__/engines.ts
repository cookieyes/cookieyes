import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { memoryStore } from "../memory.js";
import { postgresStore } from "../postgres.js";
import { sqliteStore } from "../sqlite.js";
import type { ConsentStore } from "../store.js";

/**
 * Every database the store tests run against. Memory and PGlite always run. SQLite
 * runs where Node has `node:sqlite` (22.5 and later). Real Postgres runs when
 * `COOKIEYES_TEST_PG_URL` is set, as in CI: PGlite answers one query at a time, so
 * only a real server can show two copies of a record racing each other.
 *
 * ```
 * docker run --rm -d -p 5499:5432 -e POSTGRES_PASSWORD=cy --name cy-pg postgres:16
 * COOKIEYES_TEST_PG_URL=postgres://postgres:cy@127.0.0.1:5499/postgres pnpm test
 * ```
 */
export type Engine = {
  name: string;
  /**
   * Starts the database once per suite. `fresh()` then gives each test an empty,
   * unmigrated store: booting PGlite compiles WebAssembly, and doing that per test
   * timed out under the load of every package testing at once.
   */
  start: () => Promise<{ fresh: () => Promise<ConsentStore>; close: () => Promise<void> }>;
};

type SqliteModule = {
  DatabaseSync: new (path: string) => Parameters<typeof sqliteStore>[0] & { close(): void };
};

async function loadSqlite(): Promise<SqliteModule | null> {
  try {
    // A variable specifier, so bundlers and Node 20 don't try to resolve it up front.
    const specifier = "node:sqlite";
    return (await import(/* @vite-ignore */ specifier)) as SqliteModule;
  } catch {
    return null;
  }
}

const sqlite = await loadSqlite();
const pgUrl = process.env.COOKIEYES_TEST_PG_URL;

const DROP = "DROP TABLE IF EXISTS cookieyes_consent_records, cookieyes_migrations";

export const ENGINES: Engine[] = [
  {
    name: "memory",
    start: async () => ({ fresh: async () => memoryStore(), close: async () => {} }),
  },
  {
    name: "pglite",
    start: async () => {
      const db = new PGlite();
      // PGlite boots on first use, not when constructed. Waiting here keeps the slow
      // WebAssembly start inside start()'s long timeout instead of the first test's
      // hook, which is what timed out in CI.
      await db.waitReady;
      return {
        fresh: async () => {
          await db.query(DROP);
          return postgresStore(db);
        },
        close: () => db.close(),
      };
    },
  },
  ...(sqlite
    ? [
        {
          name: "sqlite",
          start: async () => {
            const open: { close(): void }[] = [];
            return {
              fresh: async () => {
                const db = new sqlite.DatabaseSync(":memory:");
                open.push(db);
                return sqliteStore(db);
              },
              close: async () => {
                for (const db of open) db.close();
              },
            };
          },
        },
      ]
    : []),
  ...(pgUrl
    ? [
        {
          name: "postgres",
          start: async () => {
            const pool = new pg.Pool({ connectionString: pgUrl, max: 10 });
            return {
              fresh: async () => {
                await pool.query(DROP);
                return postgresStore(pool);
              },
              close: () => pool.end(),
            };
          },
        },
      ]
    : []),
];
