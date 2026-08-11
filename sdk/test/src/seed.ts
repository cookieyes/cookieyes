import {
  type CategoryDef,
  type ConsentSnapshot,
  generateConsentId,
  type Regulation,
  type ResolvedCategories,
  resolveCategories,
  serializeCookie,
} from "@cookieyes/core";
import { clearConsentCookie, installDocumentShim, writeConsentCookie } from "./document.js";
import type { DefaultCategoryDefs, SeedOptions } from "./types.js";
import { assertKnownCategory } from "./validate.js";

/**
 * Fixed rather than `Date.now()` so a seeded returning visitor produces a
 * byte-identical snapshot on every run. Core stores `lastRenewed` and never
 * branches on it, so pinning it changes no behaviour.
 */
export const SEED_LAST_RENEWED = 1;

/** Default regulation: GDPR is opt-in, which is the branch most consumer code has. */
export const DEFAULT_SEED_REGULATION: Regulation = "GDPR";

type SeedMap = Record<string, boolean | undefined>;

/**
 * Build the snapshot for a visitor who has *already decided*. Required ids are
 * forced on and anything the caller didn't mention is off — the same shape core's
 * own `rawFieldsToSnapshot` produces, derived from core's resolved taxonomy so a
 * change to what "required" means can't drift out of sync here.
 */
function buildSeedSnapshot(
  resolved: ResolvedCategories,
  regulation: Regulation,
  seed: SeedMap,
  consentId: string | undefined,
): ConsentSnapshot {
  const categories: Record<string, boolean> = {};
  for (const id of resolved.ids) {
    categories[id] = resolved.requiredIds.has(id) ? true : seed[id] === true;
  }
  return {
    consentId: consentId ?? generateConsentId(),
    hasActed: true,
    categories,
    regulation,
    lastRenewed: SEED_LAST_RENEWED,
    taxonomyHash: resolved.taxonomyHash,
  };
}

/**
 * Prepare the cookie the engine will read at construction: install the jar if
 * needed, clear anything left over, then (only when consent was seeded) write the
 * state through **core's own `serializeCookie`**. Nothing here knows the cookie's
 * wire format — that stays owned by core, which is what keeps the two in step.
 *
 * Returns the seeded snapshot, or `null` for a brand-new visitor.
 */
export function prepareConsentCookie(
  resolved: ResolvedCategories,
  regulation: Regulation,
  initialConsent: SeedMap | undefined,
  consentId: string | undefined,
): ConsentSnapshot | null {
  installDocumentShim();
  clearConsentCookie();

  if (initialConsent === undefined) return null;
  for (const key of Object.keys(initialConsent)) assertKnownCategory(key, resolved.ids);

  const snapshot = buildSeedSnapshot(resolved, regulation, initialConsent, consentId);
  writeConsentCookie(serializeCookie(snapshot));
  return snapshot;
}

/**
 * Seed a pretend visitor's prior consent without building a harness — the
 * primitive behind `createConsentTest`, exported for the cases that need to drive
 * a *different* entry point afterwards. The React recipe in the README uses it to
 * seed core's cookie and then call `@cookieyes/react`'s own `initCookieYes`.
 *
 * Omit `initialConsent` for a brand-new visitor (`hasActed: false`). Pass `{}` for
 * a returning visitor who agreed to nothing beyond the required categories.
 *
 * Call `resetConsentTestState()` afterwards to undo it.
 */
export function seedConsentCookie<const C extends readonly CategoryDef[] = DefaultCategoryDefs>(
  options: SeedOptions<C> = {},
): ConsentSnapshot | null {
  const resolved = resolveCategories(options.categories ? [...options.categories] : undefined);
  return prepareConsentCookie(
    resolved,
    options.regulation ?? DEFAULT_SEED_REGULATION,
    options.initialConsent as SeedMap | undefined,
    options.consentId,
  );
}
