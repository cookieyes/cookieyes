import { _createSqlStore, type SqlRow } from "./sql.js";
import type { ConsentStore } from "./store.js";

/**
 * A synchronous SQLite database: `node:sqlite`'s `DatabaseSync`, `better-sqlite3`, or
 * `bun:sqlite`. They share this shape.
 */
export type SqliteDatabase = {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
    /** `better-sqlite3` sets it; its `all()` throws on a statement that returns no rows. */
    reader?: boolean;
  };
};

/** A Cloudflare D1 binding (`env.DB`). */
export type D1Database = {
  prepare(sql: string): {
    bind(...params: unknown[]): { all(): Promise<{ results?: unknown[] }> };
  };
};

/**
 * A store that keeps records in SQLite. Good for local development and single-server
 * apps; keep the file on storage that outlives a deploy. Needs SQLite 3.35 or later.
 *
 * @example
 * import { DatabaseSync } from "node:sqlite";
 * const database = sqliteStore(new DatabaseSync("./consent.db"));
 */
export function sqliteStore(db: SqliteDatabase): ConsentStore {
  return _createSqlStore("sqlite", async (sql, params) => {
    const statement = db.prepare(sql);
    if (statement.reader === false) {
      statement.run(...params);
      return [];
    }
    return statement.all(...params) as SqlRow[];
  });
}

/**
 * A store that keeps records in Cloudflare D1, for a backend running on Workers.
 *
 * @example
 * export default {
 *   fetch: (request, env) =>
 *     createConsentBackend({ database: d1Store(env.DB), trustedOrigins }).handler(request),
 * };
 */
export function d1Store(db: D1Database): ConsentStore {
  return _createSqlStore("sqlite", async (sql, params) => {
    const result = await db
      .prepare(sql)
      .bind(...params)
      .all();
    return (result.results ?? []) as SqlRow[];
  });
}
