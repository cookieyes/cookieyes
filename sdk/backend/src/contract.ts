import type { RecordAction, RecordRegulation, RecordSource, StoredRecord } from "./store.js";

/**
 * Version of the HTTP contract between the SDK and a consent backend. It changes only
 * when a compatible backend would have to change too; `@cookieyes/test/backend`
 * checks a server against the same number.
 */
export const CONTRACT_VERSION = 1;

/** A request body larger than this is refused. A real record is a few hundred bytes. */
export const MAX_BODY_BYTES = 4096;

/** How a field relates to the visitor, for anyone deciding what may be stored. */
export type PersonalData = "no" | "pseudonymous" | "coarse location" | "yes";

/** One field of the body the SDK sends. */
export type PayloadField = {
  name: string;
  type: "string" | "boolean" | "object";
  required: boolean;
  personalData: PersonalData;
  description: string;
  enum?: readonly string[] | undefined;
  format?: "date-time" | undefined;
  maxLength?: number | undefined;
};

/**
 * The body the SDK POSTs for each decision (`ConsentPayload` in `@cookieyes/core`).
 * A test builds a real payload with the SDK and checks it against this list, so the
 * two cannot drift apart.
 */
export const PAYLOAD_FIELDS: readonly PayloadField[] = [
  {
    name: "recordId",
    type: "string",
    required: true,
    personalData: "no",
    maxLength: 256,
    description:
      "Id of this decision. The same decision always has the same id, so a retry is stored once.",
  },
  {
    name: "consentId",
    type: "string",
    required: true,
    personalData: "pseudonymous",
    maxLength: 128,
    description: "Random id of the visitor, kept in their consent cookie.",
  },
  {
    name: "categories",
    type: "object",
    required: true,
    personalData: "no",
    description: "Each category id, and whether the visitor granted it.",
  },
  {
    name: "regulation",
    type: "string",
    required: true,
    personalData: "no",
    enum: ["GDPR", "CCPA", "DEFAULT"],
    description: "The regulation the banner applied.",
  },
  {
    name: "domain",
    type: "string",
    required: true,
    personalData: "no",
    maxLength: 253,
    description: "Hostname of the site where the visitor decided.",
  },
  {
    name: "decidedAt",
    type: "string",
    required: true,
    personalData: "no",
    format: "date-time",
    description: "When the visitor decided, in UTC. Not when the record was sent.",
  },
  {
    name: "taxonomyHash",
    type: "string",
    required: true,
    personalData: "no",
    maxLength: 64,
    description: "Fingerprint of the category list the visitor was shown.",
  },
  {
    name: "action",
    type: "string",
    required: true,
    personalData: "no",
    enum: ["accept_all", "reject_all", "accept_selected", "save"],
    description: "What the visitor did.",
  },
  {
    name: "source",
    type: "string",
    required: true,
    personalData: "no",
    enum: ["banner", "preferences", "optout", "api"],
    description: "Where the visitor decided. `api` is a call from the site's own code.",
  },
  {
    name: "region",
    type: "string",
    required: false,
    personalData: "coarse location",
    maxLength: 16,
    description: "Region the SDK detected, like `US-CA`. Sent only with region detection on.",
  },
  {
    name: "sdkVersion",
    type: "string",
    required: false,
    personalData: "no",
    maxLength: 32,
    description: "Version of `@cookieyes/core` that sent the record.",
  },
  {
    name: "gpc",
    type: "boolean",
    required: false,
    personalData: "no",
    description: "Whether the browser sent the Global Privacy Control signal.",
  },
];

/** One column of a stored record. */
export type RecordField = {
  name: keyof StoredRecord;
  column: string;
  personalData: PersonalData;
  description: string;
};

/** What is stored for each decision, in export order. */
export const RECORD_FIELDS: readonly RecordField[] = [
  { name: "recordId", column: "record_id", personalData: "no", description: "Id of the decision." },
  {
    name: "consentId",
    column: "consent_id",
    personalData: "pseudonymous",
    description: "Random id of the visitor. Use it to find or delete their records.",
  },
  {
    name: "decidedAt",
    column: "decided_at",
    personalData: "no",
    description: "When the visitor decided, by their device's clock.",
  },
  {
    name: "receivedAt",
    column: "received_at",
    personalData: "no",
    description: "When the server received the record, by the server's clock.",
  },
  {
    name: "granted",
    column: "granted",
    personalData: "no",
    description: "Categories the visitor granted.",
  },
  {
    name: "denied",
    column: "denied",
    personalData: "no",
    description: "Categories the visitor denied.",
  },
  {
    name: "regulation",
    column: "regulation",
    personalData: "no",
    description: "The regulation the banner applied.",
  },
  {
    name: "region",
    column: "region",
    personalData: "coarse location",
    description: "Region the SDK detected, when region detection is on.",
  },
  { name: "domain", column: "domain", personalData: "no", description: "The site's hostname." },
  {
    name: "taxonomyHash",
    column: "taxonomy_hash",
    personalData: "no",
    description: "Fingerprint of the category list the visitor was shown.",
  },
  { name: "action", column: "action", personalData: "no", description: "What the visitor did." },
  { name: "source", column: "source", personalData: "no", description: "Where they decided." },
  {
    name: "sdkVersion",
    column: "sdk_version",
    personalData: "no",
    description: "Version of the SDK that sent the record.",
  },
  {
    name: "gpc",
    column: "gpc",
    personalData: "no",
    description: "Whether the browser sent Global Privacy Control.",
  },
  {
    name: "ip",
    column: "ip",
    personalData: "yes",
    description: "Empty unless you turn on `ipAddress`; then truncated or hashed, never raw.",
  },
];

/** A body that passed validation, before the server adds its own fields. */
export type ValidPayload = {
  recordId: string;
  consentId: string;
  categories: Record<string, boolean>;
  regulation: RecordRegulation;
  domain: string;
  decidedAt: string;
  taxonomyHash: string;
  action: RecordAction;
  source: RecordSource;
  region?: string | undefined;
  sdkVersion?: string | undefined;
  gpc?: boolean | undefined;
};

/** Why a body was refused, in a form the handler can send back. */
export type PayloadError = { code: string; message: string };

const MAX_CATEGORIES = 64;
const MAX_CATEGORY_ID_LENGTH = 64;
// Printable ASCII without spaces: the id appears in lookup URLs and in logs a person reads.
const VISITOR_ID = /^[\x21-\x7e]+$/;

/** True for a string that can be a visitor's consent id. */
export function isConsentId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && VISITOR_ID.test(value);
}

function checkField(field: PayloadField, value: unknown): string | null {
  if (field.type === "boolean") {
    return typeof value === "boolean" ? null : `${field.name} must be true or false`;
  }
  if (field.type === "object") return checkCategories(value);
  if (typeof value !== "string" || value.length === 0) {
    return `${field.name} must be a non-empty string`;
  }
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return `${field.name} must be at most ${field.maxLength} characters`;
  }
  if (field.enum && !field.enum.includes(value)) {
    return `${field.name} must be one of ${field.enum.join(", ")}`;
  }
  if (field.format === "date-time" && Number.isNaN(Date.parse(value))) {
    return `${field.name} must be an ISO 8601 date and time`;
  }
  if (field.name === "consentId" && !VISITOR_ID.test(value)) {
    return "consentId must not contain spaces or control characters";
  }
  return null;
}

function checkCategories(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "categories must be an object of category ids to true or false";
  }
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > MAX_CATEGORIES) {
    return `categories must have between 1 and ${MAX_CATEGORIES} entries`;
  }
  for (const [id, granted] of entries) {
    // The same rule the SDK applies to category ids: they are stored comma-joined.
    if (id.length > MAX_CATEGORY_ID_LENGTH || id.includes(",") || id.includes(":")) {
      return `category id "${id.slice(0, MAX_CATEGORY_ID_LENGTH)}" is not valid`;
    }
    if (typeof granted !== "boolean") return `categories.${id} must be true or false`;
  }
  return null;
}

/**
 * Check a parsed body against the contract. Unknown fields are dropped, not refused:
 * a newer SDK may send a field this server does not know yet, and refusing it would
 * lose every record that SDK sends until the server is upgraded.
 */
export function validatePayload(
  body: unknown,
): { ok: true; value: ValidPayload } | { ok: false; error: PayloadError } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: { code: "invalid_payload", message: "Body must be an object." } };
  }
  const input = body as Record<string, unknown>;
  // Records from SDK versions before 0.9.0 have no id, so retries of them can't be
  // told apart from new decisions. Those versions had no retry queue to drain.
  if (input.recordId === undefined) {
    return {
      ok: false,
      error: {
        code: "record_id_required",
        message: "recordId is required. Upgrade @cookieyes/core to 0.9.0 or later.",
      },
    };
  }
  const value: Record<string, unknown> = {};
  for (const field of PAYLOAD_FIELDS) {
    const raw = input[field.name];
    if (raw === undefined) {
      if (field.required) {
        return {
          ok: false,
          error: { code: "invalid_payload", message: `${field.name} is required.` },
        };
      }
      continue;
    }
    const problem = checkField(field, raw);
    if (problem) return { ok: false, error: { code: "invalid_payload", message: `${problem}.` } };
    value[field.name] = raw;
  }
  // One spelling of every instant, so stored times sort and compare as text.
  value.decidedAt = new Date(value.decidedAt as string).toISOString();
  return { ok: true, value: value as ValidPayload };
}

/** Turn a valid body into the row that is stored. */
export function toStoredRecord(
  payload: ValidPayload,
  receivedAt: Date,
  ip: string | null,
): StoredRecord {
  const granted: string[] = [];
  const denied: string[] = [];
  for (const [id, on] of Object.entries(payload.categories)) (on ? granted : denied).push(id);
  return {
    recordId: payload.recordId,
    consentId: payload.consentId,
    decidedAt: payload.decidedAt,
    receivedAt: receivedAt.toISOString(),
    granted,
    denied,
    regulation: payload.regulation,
    region: payload.region ?? null,
    domain: payload.domain,
    taxonomyHash: payload.taxonomyHash,
    action: payload.action,
    source: payload.source,
    sdkVersion: payload.sdkVersion ?? null,
    gpc: payload.gpc ?? null,
    ip,
  };
}
