/** The regulation the SDK applied when the visitor decided. */
export type RecordRegulation = "GDPR" | "CCPA" | "DEFAULT";

/** What the visitor did. Mirrors `ConsentAction` in `@cookieyes/core`. */
export type RecordAction = "accept_all" | "reject_all" | "accept_selected" | "save";

/** Where the visitor decided. Mirrors `ConsentSource` in `@cookieyes/core`. */
export type RecordSource = "banner" | "preferences" | "optout" | "api";

/**
 * One consent decision as stored: one row, plain values, nothing nested, so it can be
 * exported as evidence without decoding anything. Timestamps are ISO 8601 in UTC.
 */
export type StoredRecord = {
  recordId: string;
  consentId: string;
  decidedAt: string;
  receivedAt: string;
  granted: string[];
  denied: string[];
  regulation: RecordRegulation;
  region: string | null;
  domain: string;
  taxonomyHash: string;
  action: RecordAction;
  source: RecordSource;
  sdkVersion: string | null;
  gpc: boolean | null;
  ip: string | null;
};

/**
 * The outcome of saving a record. `"replayed"` means the same decision was already
 * stored (a retry); `"conflict"` means its `recordId` is taken by a different one.
 */
export type SaveResult = "created" | "replayed" | "conflict";

/** Migrations that a run applied, or that are still waiting to be applied. */
export type MigrationReport = { applied: string[]; pending: string[] };

/**
 * Everything a database adapter implements. `@cookieyes/backend/postgres`,
 * `/sqlite` and `/memory` are the reference implementations, and the conformance
 * suite in `@cookieyes/test/backend` proves any other one.
 */
export interface ConsentStore {
  /** Create or upgrade the schema. With `dryRun`, only report what would run. */
  migrate(options?: { dryRun?: boolean | undefined }): Promise<MigrationReport>;
  /** Rejects when the database is unreachable; otherwise says whether the schema is current. */
  check(): Promise<"current" | "pending">;
  /** Store a record once per `recordId`, however many times it arrives. */
  save(record: StoredRecord): Promise<SaveResult>;
  /** The visitor's latest decision, or `null`. */
  current(consentId: string): Promise<StoredRecord | null>;
  /** Every decision the visitor made, oldest first. */
  list(consentId: string): Promise<StoredRecord[]>;
  /** Delete every record for the visitor and return how many there were. */
  remove(consentId: string): Promise<number>;
  /** Delete every record received before `receivedBefore` and return how many there were. */
  prune(receivedBefore: Date): Promise<number>;
}

/**
 * True when two records describe the same decision. `receivedAt` and `ip` are left
 * out on purpose: a retry arrives later, and possibly from another network.
 * @internal
 */
export function _sameDecision(a: StoredRecord, b: StoredRecord): boolean {
  return (
    a.consentId === b.consentId &&
    a.decidedAt === b.decidedAt &&
    a.granted.join(",") === b.granted.join(",") &&
    a.denied.join(",") === b.denied.join(",") &&
    a.regulation === b.regulation &&
    a.region === b.region &&
    a.domain === b.domain &&
    a.taxonomyHash === b.taxonomyHash &&
    a.action === b.action &&
    a.source === b.source &&
    a.sdkVersion === b.sdkVersion &&
    a.gpc === b.gpc
  );
}
