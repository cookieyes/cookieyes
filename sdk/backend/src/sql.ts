import {
  _sameDecision,
  type ConsentStore,
  type RecordAction,
  type RecordRegulation,
  type RecordSource,
  type StoredRecord,
} from "./store.js";

/** Runs one statement and returns its rows (none for a statement without `RETURNING`). */
export type SqlQuery = (sql: string, params: readonly unknown[]) => Promise<SqlRow[]>;

/** A row as a driver returns it, keyed by column name. */
export type SqlRow = Record<string, unknown>;

type Dialect = "postgres" | "sqlite";

const TABLE = "cookieyes_consent_records";
const LEDGER = "cookieyes_migrations";

const COLUMNS = [
  "record_id",
  "consent_id",
  "decided_at",
  "received_at",
  "granted",
  "denied",
  "regulation",
  "region",
  "domain",
  "taxonomy_hash",
  "action",
  "source",
  "sdk_version",
  "gpc",
  "ip",
] as const;

/**
 * Schema changes, in order. Each statement is idempotent, so a migration that stopped
 * halfway, or two instances migrating at once, finish cleanly when run again. That is
 * also why there is no transaction: a pooled client gives no guarantee that `BEGIN`
 * and the statements after it reach the same connection.
 */
const MIGRATIONS: { id: string; up: (d: Dialect) => string[] }[] = [
  {
    id: "0001_consent_records",
    up: (d) => {
      const time = d === "postgres" ? "timestamptz" : "text";
      const bool = d === "postgres" ? "boolean" : "integer";
      return [
        `CREATE TABLE IF NOT EXISTS ${TABLE} (
  record_id text PRIMARY KEY,
  consent_id text NOT NULL,
  decided_at ${time} NOT NULL,
  received_at ${time} NOT NULL,
  granted text NOT NULL,
  denied text NOT NULL,
  regulation text NOT NULL,
  region text,
  domain text NOT NULL,
  taxonomy_hash text NOT NULL,
  action text NOT NULL,
  source text NOT NULL,
  sdk_version text,
  gpc ${bool},
  ip text
)`,
        `CREATE INDEX IF NOT EXISTS ${TABLE}_consent_idx ON ${TABLE} (consent_id, decided_at)`,
        `CREATE INDEX IF NOT EXISTS ${TABLE}_received_idx ON ${TABLE} (received_at)`,
      ];
    },
  },
];

/** Ids of every migration this version knows, oldest first. */
export const MIGRATION_IDS = MIGRATIONS.map((m) => m.id);

// Postgres drivers return Date for timestamptz; some return text, and SQLite always does.
function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toList(value: unknown): string[] {
  return value ? String(value).split(",") : [];
}

function toRecord(row: SqlRow): StoredRecord {
  const text = (key: string) => (row[key] == null ? null : String(row[key]));
  return {
    recordId: String(row.record_id),
    consentId: String(row.consent_id),
    decidedAt: toIso(row.decided_at),
    receivedAt: toIso(row.received_at),
    granted: toList(row.granted),
    denied: toList(row.denied),
    regulation: String(row.regulation) as RecordRegulation,
    region: text("region"),
    domain: String(row.domain),
    taxonomyHash: String(row.taxonomy_hash),
    action: String(row.action) as RecordAction,
    source: String(row.source) as RecordSource,
    sdkVersion: text("sdk_version"),
    // SQLite has no boolean type and stores 1 or 0.
    gpc: row.gpc == null ? null : Boolean(row.gpc),
    ip: text("ip"),
  };
}

/**
 * The store both SQL adapters share: the statements are the same, only placeholders,
 * column types and how a boolean is sent differ between the dialects.
 * @internal
 */
export function _createSqlStore(dialect: Dialect, query: SqlQuery): ConsentStore {
  const at = (n: number) => (dialect === "postgres" ? `$${n}` : "?");
  const flag = (value: boolean | null) =>
    value === null || dialect === "postgres" ? value : Number(value);

  const ledgerExists = async () => {
    const rows =
      dialect === "postgres"
        ? await query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1",
            [LEDGER],
          )
        : await query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", [LEDGER]);
    return rows.length > 0;
  };

  const appliedIds = async () => {
    await query("SELECT 1", []);
    if (!(await ledgerExists())) return new Set<string>();
    const rows = await query(`SELECT id FROM ${LEDGER}`, []);
    return new Set(rows.map((r) => String(r.id)));
  };

  const select = `SELECT ${COLUMNS.join(", ")} FROM ${TABLE}`;

  return {
    async migrate(options) {
      const done = await appliedIds();
      const pending = MIGRATIONS.filter((m) => !done.has(m.id));
      if (options?.dryRun) return { applied: [], pending: pending.map((m) => m.id) };
      await query(
        `CREATE TABLE IF NOT EXISTS ${LEDGER} (id text PRIMARY KEY, applied_at text NOT NULL)`,
        [],
      );
      for (const migration of pending) {
        for (const statement of migration.up(dialect)) await query(statement, []);
        await query(
          `INSERT INTO ${LEDGER} (id, applied_at) VALUES (${at(1)}, ${at(2)}) ON CONFLICT (id) DO NOTHING`,
          [migration.id, new Date().toISOString()],
        );
      }
      return { applied: pending.map((m) => m.id), pending: [] };
    },

    async check() {
      const done = await appliedIds();
      return MIGRATION_IDS.every((id) => done.has(id)) ? "current" : "pending";
    },

    async save(record) {
      const values = [
        record.recordId,
        record.consentId,
        record.decidedAt,
        record.receivedAt,
        record.granted.join(","),
        record.denied.join(","),
        record.regulation,
        record.region,
        record.domain,
        record.taxonomyHash,
        record.action,
        record.source,
        record.sdkVersion,
        flag(record.gpc),
        record.ip,
      ];
      // Insert-or-nothing in one statement, so two copies of a decision arriving at
      // the same moment still leave one row: the database's key decides, not a read.
      const inserted = await query(
        `INSERT INTO ${TABLE} (${COLUMNS.join(", ")}) VALUES (${values.map((_, i) => at(i + 1)).join(", ")}) ON CONFLICT (record_id) DO NOTHING RETURNING record_id`,
        values,
      );
      if (inserted.length > 0) return "created";
      const [row] = await query(`${select} WHERE record_id = ${at(1)}`, [record.recordId]);
      // Gone between the two statements means it was just deleted on request:
      // answering "already stored" keeps the retry from bringing it back.
      if (!row) return "replayed";
      return _sameDecision(toRecord(row), record) ? "replayed" : "conflict";
    },

    async current(consentId) {
      const [row] = await query(
        `${select} WHERE consent_id = ${at(1)} ORDER BY decided_at DESC, received_at DESC LIMIT 1`,
        [consentId],
      );
      return row ? toRecord(row) : null;
    },

    async list(consentId) {
      const rows = await query(
        `${select} WHERE consent_id = ${at(1)} ORDER BY decided_at ASC, received_at ASC`,
        [consentId],
      );
      return rows.map(toRecord);
    },

    async remove(consentId) {
      const rows = await query(
        `DELETE FROM ${TABLE} WHERE consent_id = ${at(1)} RETURNING record_id`,
        [consentId],
      );
      return rows.length;
    },

    async prune(receivedBefore) {
      const rows = await query(
        `DELETE FROM ${TABLE} WHERE received_at < ${at(1)} RETURNING record_id`,
        [receivedBefore.toISOString()],
      );
      return rows.length;
    },
  };
}
