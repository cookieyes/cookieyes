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
 * - A signal is `granted` if *any* granted category maps to it.
 * - `security_storage` is always `granted` (it's strictly necessary and not
 *   consentable — this mirrors production's behaviour).
 * - A signal that no category maps to defaults to `denied`.
 */
export function computeGoogleConsent(
  resolved: ResolvedCategories,
  categories: Record<string, boolean>,
): Record<GoogleConsentSignal, GcmValue> {
  const result = {} as Record<GoogleConsentSignal, GcmValue>;
  for (const signal of ALL_SIGNALS) {
    result[signal] = "denied";
  }
  // security_storage is never gated on consent.
  result.security_storage = "granted";

  for (const def of resolved.list) {
    if (!def.gcm || def.gcm.length === 0) continue;
    if (!categories[def.id]) continue;
    for (const signal of def.gcm) {
      result[signal] = "granted";
    }
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
): void {
  if (!hasDataLayer()) return;

  const consent = computeGoogleConsent(resolved, categories);
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
