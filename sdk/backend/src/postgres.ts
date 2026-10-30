import { _createSqlStore, type SqlRow } from "./sql.js";
import type { ConsentStore } from "./store.js";

/**
 * Any Postgres client with a `query(text, params)` method: a `pg` `Pool` or `Client`,
 * PGlite, Neon's serverless driver, or Vercel Postgres. For postgres.js, pass
 * `{ query: (text, params) => sql.unsafe(text, params) }`.
 */
export type PostgresClient = {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] } | unknown[]>;
};

/**
 * A store that keeps records in Postgres, through a client you already have. Run
 * `migrate()` (or `cookieyes-backend migrate --apply`) once before the first record.
 *
 * @example
 * import { Pool } from "pg";
 * const database = postgresStore(new Pool({ connectionString: process.env.DATABASE_URL }));
 */
export function postgresStore(client: PostgresClient): ConsentStore {
  return _createSqlStore("postgres", async (sql, params) => {
    const result = await client.query(sql, [...params]);
    return (Array.isArray(result) ? result : result.rows) as SqlRow[];
  });
}
