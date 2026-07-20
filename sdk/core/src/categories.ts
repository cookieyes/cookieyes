import { COOKIE_META_KEYS } from "./cookie.js";
import type { ConsentCategory } from "./types.js";

/**
 * Google Consent Mode v2 storage/signal types. A category can declare which of
 * these it represents via {@link CategoryDef.gcm}; the SDK then broadcasts them
 * (see google-consent-mode.ts). `security_storage` is always granted and is
 * handled by the broadcast itself, so it never needs to be mapped.
 */
export type GoogleConsentSignal =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

/**
 * A single consent category. `id` is the stable key stored in the cookie and
 * used everywhere (banner, preferences, read APIs, integrations). Exactly one
 * category should be marked `required` — the always-on, non-optional one (like
 * the default "necessary") — flagged explicitly here, never inferred from a
 * name, so it survives full renaming.
 */
export type CategoryDef = {
  id: ConsentCategory;
  /** The always-on, non-optional category. At least one is required. */
  required?: boolean | undefined;
  /** Display label. Falls back to the translation for built-in ids. */
  label?: string | undefined;
  /** Display description. Falls back to the translation for built-in ids. */
  description?: string | undefined;
  /** Google Consent Mode signals this category governs (see {@link GoogleConsentSignal}). */
  gcm?: GoogleConsentSignal[] | undefined;
};

/**
 * The built-in five, used verbatim when a customer configures nothing. GCM
 * mapping mirrors production's `_ckySetGoogleConsentMode` (analytics →
 * analytics_storage, advertisement → the ad_* signals, functional →
 * functionality/personalization; performance maps to nothing; security_storage
 * is always granted by the broadcast).
 */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "necessary", required: true },
  { id: "functional", gcm: ["functionality_storage", "personalization_storage"] },
  { id: "analytics", gcm: ["analytics_storage"] },
  { id: "performance" },
  { id: "advertisement", gcm: ["ad_storage", "ad_user_data", "ad_personalization"] },
];

export type ResolvedCategories = {
  /** Ordered category definitions actually in effect. */
  list: CategoryDef[];
  /** Ordered ids (fast access). */
  ids: ConsentCategory[];
  /** Ids marked `required` (always granted, never toggleable). */
  requiredIds: Set<ConsentCategory>;
  /** Stable signature of this taxonomy; a change here re-requests consent. */
  taxonomyHash: string;
  /** True when the built-in five are in effect (configured or fallback). */
  isDefault: boolean;
};

/** Small, stable non-crypto hash → short base36 string, for the cookie stamp. */
function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function build(list: CategoryDef[], isDefault: boolean): ResolvedCategories {
  const ids = list.map((c) => c.id);
  const requiredIds = new Set(list.filter((c) => c.required).map((c) => c.id));
  // Signature includes id + required flag + gcm, so any meaningful change to
  // the taxonomy invalidates prior consent (see the manager's load check).
  const signature = list
    .map((c) => `${c.id}:${c.required ? 1 : 0}:${(c.gcm ?? []).join("+")}`)
    .join("|");
  return { list, ids, requiredIds, taxonomyHash: hashString(signature), isDefault };
}

/**
 * Validate a custom category config. Returns a human-readable reason if it's
 * invalid, or `null` if it's good. Order matters: the first failing rule wins.
 */
function validationError(defs: CategoryDef[]): string | null {
  const ids = defs.map((d) => d.id);
  if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
    return "every category needs a non-empty string id";
  }
  // `,` and `:` are the cookie's field/key delimiters — an id containing either
  // would corrupt persistence silently on the round-trip.
  if (ids.some((id) => id.includes(",") || id.includes(":"))) {
    return "category ids must not contain ',' or ':'";
  }
  if (new Set(ids).size !== ids.length) {
    return "category ids must be unique";
  }
  // Ids that would collide with the cookie's reserved metadata keys — a category
  // named e.g. "consent" or "tax" would corrupt persistence silently.
  if (ids.some((id) => COOKIE_META_KEYS.has(id))) {
    return `category ids must not be one of the reserved keys: ${[...COOKIE_META_KEYS].join(", ")}`;
  }
  if (!defs.some((d) => d.required === true)) {
    return "at least one category must be marked { required: true }";
  }
  return null;
}

/**
 * Resolve the category list from config. Returns the built-in five when nothing
 * is configured. On an invalid custom config (empty, duplicate/reserved ids, or
 * no `required` category) it warns and falls back to the built-in five, rather
 * than leaving the visitor a broken/empty or unprotected setup.
 */
export function resolveCategories(defs?: CategoryDef[]): ResolvedCategories {
  if (!defs || defs.length === 0) return build(DEFAULT_CATEGORIES, true);

  const error = validationError(defs);
  if (error) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        `[cookieyes] Invalid categories config (${error}). Falling back to the ` +
          "default five (necessary, functional, analytics, performance, advertisement).",
      );
    }
    return build(DEFAULT_CATEGORIES, true);
  }

  return build(defs, false);
}
