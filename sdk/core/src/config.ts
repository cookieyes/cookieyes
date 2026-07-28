import type { CategoryDef } from "./categories.js";
import type { NetworkBlockerConfig } from "./network-blocker.js";
import type { BuiltInIntegration, StopHandler } from "./stop-handlers.js";
import type {
  ColorScheme,
  ConsentBackend,
  ConsentCategory,
  ConsentRuntimeMode,
  ConsentSnapshot,
  CookieYesConfig,
  I18nConfig,
  RegionConfig,
  Regulation,
  ThemeConfig,
} from "./types.js";

/**
 * The canonical config with every deprecated alias already collapsed into its
 * top-level key. Both `@cookieyes/core` and `@cookieyes/react` consume the
 * output of {@link _normalizeConfig}, so alias resolution lives in exactly one
 * place and the two packages can never drift.
 *
 * @internal
 */
export type _NormalizedConfig = {
  mode: ConsentRuntimeMode;
  regulation?: Regulation | undefined;
  region?: RegionConfig | undefined;
  colorScheme?: ColorScheme | undefined;
  theme?: ThemeConfig | undefined;
  i18n?: I18nConfig | undefined;
  consentCategories?: ConsentCategory[] | undefined;
  categories?: CategoryDef[] | undefined;
  networkBlocker?: NetworkBlockerConfig | undefined;
  reloadOnRevoke?: boolean | undefined;
  integrations?: BuiltInIntegration[] | undefined;
  customStopHandlers?: StopHandler[] | undefined;
  onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
  onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
  apiUrl?: string | undefined;
  apiKey?: string | undefined;
  backend?: ConsentBackend | undefined;
};

function warn(message: string): void {
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(message);
  }
}

/**
 * Resolve a public {@link CookieYesConfig} into its canonical internal form.
 *
 * Deprecated aliases map silently to their canonical key when used alone; when
 * an alias and its canonical key are both present, the canonical key wins and
 * exactly one warning is logged for that collision.
 *
 * - `overrides.regulation` → `regulation`
 * - `backendURL` → `apiUrl`
 *
 * @internal
 */
export function _normalizeConfig(config: CookieYesConfig): _NormalizedConfig {
  const normalized: _NormalizedConfig = { mode: config.mode };

  // ── regulation (top-level) ⇐ deprecated overrides.regulation ──────────────
  const nestedRegulation = config.overrides?.regulation;
  if (config.regulation !== undefined) {
    normalized.regulation = config.regulation;
    if (nestedRegulation !== undefined) {
      warn(
        "[CookieYes] Received both `regulation` and the deprecated " +
          "`overrides.regulation`. Using the top-level `regulation` and ignoring " +
          "`overrides`. Drop the `overrides` object — it is deprecated and will be " +
          "removed after three release cycles.",
      );
    }
  } else if (nestedRegulation !== undefined) {
    normalized.regulation = nestedRegulation;
  }

  if (config.region !== undefined) normalized.region = config.region;
  if (config.colorScheme !== undefined) normalized.colorScheme = config.colorScheme;
  if (config.theme !== undefined) normalized.theme = config.theme;
  if (config.i18n !== undefined) normalized.i18n = config.i18n;
  if (config.consentCategories !== undefined)
    normalized.consentCategories = config.consentCategories;
  if (config.categories !== undefined) normalized.categories = config.categories;
  if (config.networkBlocker !== undefined) normalized.networkBlocker = config.networkBlocker;
  if (config.reloadOnRevoke !== undefined) normalized.reloadOnRevoke = config.reloadOnRevoke;
  if (config.integrations !== undefined) normalized.integrations = config.integrations;
  if (config.customStopHandlers !== undefined)
    normalized.customStopHandlers = config.customStopHandlers;
  if (config.onConsentReady !== undefined) normalized.onConsentReady = config.onConsentReady;
  if (config.onConsentUpdate !== undefined) normalized.onConsentUpdate = config.onConsentUpdate;

  // ── backend keys (self-hosted only) ⇐ deprecated backendURL ───────────────
  if (config.mode === "self-hosted") {
    if (config.apiKey !== undefined) normalized.apiKey = config.apiKey;
    if (config.backend !== undefined) normalized.backend = config.backend;

    if (config.apiUrl !== undefined) {
      normalized.apiUrl = config.apiUrl;
      if (config.backendURL !== undefined) {
        warn(
          "[CookieYes] Received both `apiUrl` and the deprecated `backendURL`. " +
            "Using `apiUrl` and ignoring `backendURL`. Rename `backendURL` to " +
            "`apiUrl` — the alias is deprecated and will be removed after three " +
            "release cycles.",
        );
      }
    } else if (config.backendURL !== undefined) {
      normalized.apiUrl = config.backendURL;
    }
  }

  return normalized;
}
