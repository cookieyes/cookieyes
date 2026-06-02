import type { ConsentCategory, ConsentSnapshot, Regulation } from "./types.js";

const COOKIE_NAME = "cookieyes-consent";
const CONSENT_CATEGORIES: ConsentCategory[] = [
  "necessary",
  "functional",
  "analytics",
  "performance",
  "advertisement",
];

type RawCookieFields = {
  consentid?: string;
  consent?: string;
  action?: string;
  necessary?: string;
  functional?: string;
  analytics?: string;
  performance?: string;
  advertisement?: string;
  lastRenewedDate?: string;
};

export function parseCookie(raw: string): RawCookieFields {
  const fields: RawCookieFields = {};
  const pairs = raw.split(",");
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim() as keyof RawCookieFields;
    const value = pair.slice(colonIdx + 1).trim();
    if (key in fields || VALID_KEYS.has(key)) {
      fields[key] = value;
    }
  }
  return fields;
}

const VALID_KEYS = new Set<keyof RawCookieFields>([
  "consentid",
  "consent",
  "action",
  "necessary",
  "functional",
  "analytics",
  "performance",
  "advertisement",
  "lastRenewedDate",
]);

export function serializeCookie(snapshot: ConsentSnapshot): string {
  const parts: string[] = [
    `consentid:${snapshot.consentId}`,
    `consent:${snapshot.hasActed ? "yes" : "no"}`,
    `action:${snapshot.hasActed ? "yes" : "no"}`,
  ];
  for (const cat of CONSENT_CATEGORIES) {
    parts.push(`${cat}:${snapshot.categories[cat] ? "yes" : "no"}`);
  }
  parts.push(`lastRenewedDate:${snapshot.lastRenewed ?? Date.now()}`);
  return parts.join(",");
}

export function readConsentCookie(): RawCookieFields | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (name === COOKIE_NAME) {
      const value = trimmed.slice(eqIdx + 1).trim();
      return parseCookie(decodeURIComponent(value));
    }
  }
  return null;
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

export function rawFieldsToSnapshot(
  fields: RawCookieFields,
  regulation: Regulation,
): ConsentSnapshot {
  const categories: Record<ConsentCategory, boolean> = {
    necessary: true,
    functional: fields.functional === "yes",
    analytics: fields.analytics === "yes",
    performance: fields.performance === "yes",
    advertisement: fields.advertisement === "yes",
  };

  return {
    consentId: fields.consentid ?? generateConsentId(),
    hasActed: fields.action === "yes",
    categories,
    regulation,
    lastRenewed: fields.lastRenewedDate ? Number(fields.lastRenewedDate) : undefined,
  };
}

export function defaultSnapshot(consentId: string, regulation: Regulation): ConsentSnapshot {
  const isOptOut = regulation === "CCPA";
  return {
    consentId,
    hasActed: false,
    categories: {
      necessary: true,
      functional: isOptOut,
      analytics: isOptOut,
      performance: isOptOut,
      advertisement: isOptOut,
    },
    regulation,
  };
}
