import type { ResolvedCategories } from "./categories.js";
import type { ConsentSnapshot, Regulation } from "./types.js";

const COOKIE_NAME = "cookieyes-consent";

// Meta keys carry consent metadata; every other `key:value` pair in the cookie
// is a category id → "yes"/"no", so custom taxonomies serialize without a
// fixed schema. Exported so category validation can reject ids that would
// collide with these (see resolveCategories) — a single source of truth.
export const COOKIE_META_KEYS = new Set([
  "consentid",
  "consent",
  "action",
  "tax",
  "lastRenewedDate",
]);

export type RawCookieFields = {
  consentid?: string;
  consent?: string;
  action?: string;
  /** Taxonomy signature stored with the consent (see ResolvedCategories.taxonomyHash). */
  tax?: string;
  lastRenewedDate?: string;
  /** Every non-meta pair: category id → "yes" | "no". */
  categories: Record<string, string>;
};

export function parseCookie(raw: string): RawCookieFields {
  const fields: RawCookieFields = { categories: {} };
  for (const pair of raw.split(",")) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (COOKIE_META_KEYS.has(key)) {
      (fields as Record<string, unknown>)[key] = value;
    } else if (key.length > 0) {
      fields.categories[key] = value;
    }
  }
  return fields;
}

export function serializeCookie(snapshot: ConsentSnapshot): string {
  const parts: string[] = [
    `consentid:${snapshot.consentId}`,
    `consent:${snapshot.hasActed ? "yes" : "no"}`,
    `action:${snapshot.hasActed ? "yes" : "no"}`,
  ];
  if (snapshot.taxonomyHash) parts.push(`tax:${snapshot.taxonomyHash}`);
  for (const [id, granted] of Object.entries(snapshot.categories)) {
    parts.push(`${id}:${granted ? "yes" : "no"}`);
  }
  parts.push(`lastRenewedDate:${snapshot.lastRenewed ?? Date.now()}`);
  return parts.join(",");
}

/**
 * Find and parse the consent cookie inside a `name=value; name2=value2` string.
 *
 * Shared by the browser (`document.cookie`) and the server (a request's `Cookie`
 * header) — the two formats are identical, and one implementation means the
 * server can never disagree with the client about what a visitor's cookie says.
 * Returns `null` when the cookie is absent or its value cannot be decoded.
 */
export function parseCookieHeader(header: string): RawCookieFields | null {
  for (const cookie of header.split(";")) {
    const trimmed = cookie.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (name !== COOKIE_NAME) continue;
    const value = trimmed.slice(eqIdx + 1).trim();
    try {
      return parseCookie(decodeURIComponent(value));
    } catch {
      // A malformed percent-encoding is a corrupt cookie, not a crash: treat it
      // as no stored consent so the visitor is asked again.
      return null;
    }
  }
  return null;
}

export function readConsentCookie(): RawCookieFields | null {
  if (typeof document === "undefined") return null;
  return parseCookieHeader(document.cookie);
}

export function writeConsentCookie(snapshot: ConsentSnapshot): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(serializeCookie(snapshot));
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export function clearConsentCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
}

export function generateConsentId(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 44);
}

/**
 * Build a snapshot from stored cookie fields, against the *resolved* taxonomy.
 * Required categories are always granted; everything else reflects the stored
 * "yes"/"no" (absent → not granted). Carries the stored taxonomy hash so the
 * caller can detect a taxonomy change.
 */
export function rawFieldsToSnapshot(
  fields: RawCookieFields,
  regulation: Regulation,
  resolved: ResolvedCategories,
): ConsentSnapshot {
  const categories: Record<string, boolean> = {};
  for (const id of resolved.ids) {
    categories[id] = resolved.requiredIds.has(id) ? true : fields.categories[id] === "yes";
  }
  return {
    consentId: fields.consentid ?? generateConsentId(),
    hasActed: fields.action === "yes",
    categories,
    regulation,
    lastRenewed: fields.lastRenewedDate ? Number(fields.lastRenewedDate) : undefined,
    taxonomyHash: fields.tax,
  };
}

export function defaultSnapshot(
  consentId: string,
  regulation: Regulation,
  resolved: ResolvedCategories,
): ConsentSnapshot {
  const isOptOut = regulation === "CCPA";
  const categories: Record<string, boolean> = {};
  for (const id of resolved.ids) {
    // CCPA is opt-out: everything implicitly on until the visitor opts out.
    // Otherwise only the required category(ies) start on.
    categories[id] = resolved.requiredIds.has(id) ? true : isOptOut;
  }
  return {
    consentId,
    hasActed: false,
    categories,
    regulation,
    taxonomyHash: resolved.taxonomyHash,
  };
}
