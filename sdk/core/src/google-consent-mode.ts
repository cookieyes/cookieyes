import type { GoogleConsentSignal, ResolvedCategories } from "./categories.js";

/**
 * The full set of Google Consent Mode v2 signals. We always broadcast all
 * seven so any Google tag (GA4, Ads, GTM-managed tags) sees a complete picture,
 * rather than only the ones a customer happened to map.
 */
const ALL_SIGNALS: GoogleConsentSignal[] = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
];

type GcmValue = "granted" | "denied";

type WindowWithDataLayer = Window & {
  dataLayer?: unknown[];
};

/**
 * True when a Google `dataLayer` is present on the page. That's our single
 * trigger: if a dataLayer exists, some Google service is (or will be) listening,
 * so we broadcast. No dataLayer → no-op.
 */
function hasDataLayer(): boolean {
  if (typeof window === "undefined") return false;
  return Array.isArray((window as WindowWithDataLayer).dataLayer);
}

/**
 * Compute the granted/denied value for every GCM signal from the current
 * category consent, using each category's `gcm` mapping.
 *
 * - When several categories map to the same signal, `match` decides: `"any"`
 *   (default) grants it if *any* mapping category is granted; `"all"` requires
 *   *every* mapping category to be granted. For the built-in five (one category
 *   per signal) the two are identical — `match` only matters for custom overlaps.
 * - `security_storage` is always `granted` (strictly necessary, not consentable).
 * - A signal that no category maps to stays `denied`.
 */
export function computeGoogleConsent(
  resolved: ResolvedCategories,
  categories: Record<string, boolean>,
  match: "all" | "any" = "any",
): Record<GoogleConsentSignal, GcmValue> {
  const result = {} as Record<GoogleConsentSignal, GcmValue>;
  for (const signal of ALL_SIGNALS) {
    if (signal === "security_storage") {
      result[signal] = "granted"; // never gated on consent
      continue;
    }
    const mappers = resolved.list.filter((def) => def.gcm?.includes(signal));
    if (mappers.length === 0) {
      result[signal] = "denied"; // nothing maps to it
      continue;
    }
    const granted =
      match === "all"
        ? mappers.every((def) => categories[def.id] === true)
        : mappers.some((def) => categories[def.id] === true);
    result[signal] = granted ? "granted" : "denied";
  }
  return result;
}

/**
 * Push a Consent Mode `update` for all seven signals onto the dataLayer, if one
 * is present. Safe to call on load and on every consent change; a no-op when no
 * Google service is on the page.
 *
 * The customer is responsible for the Consent Mode *default* (the gtag snippet
 * that must run before their Google tags, typically denying everything). This
 * function owns the *update* that reflects the visitor's actual choice.
 */
export function broadcastGoogleConsent(
  resolved: ResolvedCategories,
  categories: Record<string, boolean>,
  match: "all" | "any" = "any",
): void {
  if (!hasDataLayer()) return;

  const consent = computeGoogleConsent(resolved, categories, match);
  const dataLayer = (window as WindowWithDataLayer).dataLayer;
  if (!dataLayer) return;

  // Emit the command in gtag's exact wire format: `gtag()` is defined as
  // `function gtag(){ dataLayer.push(arguments); }`, so Google's Consent Mode
  // reads back an *arguments object* — not a plain array. We reproduce that
  // shape here (rather than pushing an array) so every GTM/gtag version
  // recognises the `consent` command reliably, without needing a global
  // `gtag()` to already exist on the page. Empty params keep `arguments` legal;
  // the variable's type makes the 3-arg call typecheck.
  const gtag: (...args: unknown[]) => void = function () {
    // biome-ignore lint/complexity/noArguments: gtag's wire format IS the arguments object — this is the canonical Google snippet.
    dataLayer.push(arguments);
  };
  gtag("consent", "update", consent);
}
