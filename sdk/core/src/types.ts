import type { CategoryDef } from "./categories.js";
import type { NetworkBlockerConfig } from "./network-blocker.js";
import type { BuiltInIntegration, StopHandler } from "./stop-handlers.js";

/**
 * A consent category id. The five built-in ids are offered for autocomplete,
 * but any string is valid — customers can define their own taxonomy via
 * `categories` (see {@link CategoryDef}).
 */
export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "performance"
  | "advertisement"
  // biome-ignore lint/complexity/noBannedTypes: `string & {}` keeps literal autocomplete while allowing any custom id
  | (string & {});

export type Regulation = "GDPR" | "CCPA" | "DEFAULT";

export type TranslationMap = {
  bannerTitle: string;
  bannerDescription: string;
  acceptAll: string;
  rejectAll: string;
  managePreferences: string;
  savePreferences: string;
  doNotSell: string;
  ccpaDescription: string;
  accept: string;
  poweredBy: string;
  preferencesTitle: string;
  preferencesIntro: string;
  categories: {
    necessary: { label: string; description: string };
    functional: { label: string; description: string };
    analytics: { label: string; description: string };
    performance: { label: string; description: string };
    advertisement: { label: string; description: string };
  };
  optOut: {
    title: string;
    description: string;
    cancel: string;
    successText: string;
    successCountdown: string;
  };
  reloadNotice: {
    message: string;
    reloadButton: string;
    dismissButton: string;
  };
};

export type ThemeConfig = {
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  mutedTextColor?: string | undefined;
  borderColor?: string | undefined;
  borderRadius?: string | undefined;
  fontFamily?: string | undefined;
  buttonVariant?: "filled" | "outlined" | undefined;
  widgetPosition?: "bottom-right" | "bottom-left" | undefined;
};

export type ScriptEntry = {
  id: string;
  src: string;
  category: ConsentCategory;
  strategy?: "afterConsent" | "lazyOnce" | undefined;
  onLoad?: (() => void) | undefined;
};

export type I18nConfig = {
  messages?: Record<string, TranslationMap> | undefined;
  locale?: string | undefined;
  detectBrowserLanguage?: boolean | undefined;
};

export type ConsentConfig = {
  apiUrl?: string | undefined;
  apiKey?: string | undefined;
  backend?: ConsentBackend | undefined;
  regulation?: Regulation | undefined;
  /**
   * Define your own category taxonomy. Omit to get the built-in five
   * (necessary, functional, analytics, performance, advertisement) unchanged.
   * At least one category must be `{ required: true }`. Invalid configs fall
   * back to the built-in five with a console warning. See {@link CategoryDef}.
   */
  categories?: CategoryDef[] | undefined;
  theme?: ThemeConfig | undefined;
  colorScheme?: ColorScheme | undefined;
  reloadOnRevoke?: boolean | undefined;
  /**
   * Built-in, first-party integrations to stop cleanly (no reload) when their
   * category is revoked — e.g. `{ vendor: "meta" }`. (Google Analytics/Tag
   * Manager are handled automatically via the Consent Mode broadcast — no entry
   * needed.) Integrations with no clean runtime stop fall back to the reload notice.
   */
  integrations?: BuiltInIntegration[] | undefined;
  /**
   * Your own scripts' stop instructions, for anything without a built-in
   * integration. A handler that can stop cleanly provides `stop()`; one that
   * can't should be registered as a reload-only handler instead so revoking it
   * shows the reload notice rather than silently continuing to track.
   */
  customStopHandlers?: StopHandler[] | undefined;
  onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
  onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
};

/**
 * Surfaced when a revoked tool has no clean runtime stop and can only be fully
 * applied by reloading. `required` is false once dismissed; `reasons` lists the
 * handler ids that triggered it (e.g. `["hotjar"]`).
 */
export type ReloadNoticeState = {
  required: boolean;
  reasons: string[];
};

export type ConsentSnapshot = {
  consentId: string;
  hasActed: boolean;
  /** Category id → granted. Keys are the configured taxonomy's ids. */
  categories: Record<string, boolean>;
  regulation: Regulation;
  lastRenewed?: number | undefined;
  /**
   * Signature of the category taxonomy in effect when this consent was
   * recorded. Lets us (and the customer) tell what a returning visitor
   * actually agreed to, and drives re-request when the taxonomy changes.
   */
  taxonomyHash?: string | undefined;
};

export type ConsentManager = ConsentSnapshot & {
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (categories: ConsentCategory[]) => void;
  updateCategory: (category: ConsentCategory, value: boolean) => void;
  savePreferences: () => void;
  resetConsent: () => void;
  showPreferences: () => void;
  hidePreferences: () => void;
  isPreferencesOpen: boolean;
  subscribe: (listener: (state: ConsentSnapshot) => void) => () => void;
  registerScript: (entry: ScriptEntry) => void;
  /** Current reload-notice state (see {@link ReloadNoticeState}). */
  reloadNotice: ReloadNoticeState;
  /** Dismiss the reload notice; it won't reappear until a new revoke needs one. */
  dismissReloadNotice: () => void;
};

/**
 * Shape of the JSON body POSTed to the customer's `apiUrl`
 * on every consent decision (Accept All / Reject All / Save Preferences).
 *
 * Customers building a TypeScript backend can import this type to get
 * full type safety on their request handler.
 */
export type ConsentPayload = {
  consentId: string;
  categories: Record<string, boolean>;
  regulation: Regulation;
  domain: string;
};

/**
 * Customer-implemented adapter that decides how a consent decision
 * reaches their backend. Provide this when `mode: "self-hosted"` and you
 * need full control over the request shape, headers, auth, transport,
 * batching, retries, etc. — anything you can't express with `apiUrl`.
 *
 * The SDK hands you a standardised `ConsentPayload`; you transform and
 * dispatch it however your backend expects.
 */
export interface ConsentBackend {
  persist(payload: ConsentPayload): Promise<void> | void;
}

/**
 * @deprecated Use `"cookie-only"` instead — identical behavior, clearer name.
 * `"offline"` still works but will be removed in a future release.
 */
type DeprecatedOfflineMode = "offline";

export type ConsentRuntimeMode = "self-hosted" | "cookie-only" | DeprecatedOfflineMode;

export type ColorScheme = "light" | "dark" | "system";

/**
 * Fields shared by every {@link CookieYesConfig} regardless of `mode`.
 * This is the one canonical config surface — both `@cookieyes/core` and
 * `@cookieyes/react` consume the exact same object, so a config is
 * copy-pasteable between them with zero edits.
 */
type CookieYesConfigCommon = {
  /**
   * Which privacy regulation applies. Top-level and identical across every
   * package (replaces the builder's `.regulation()` and core's former
   * nested `overrides.regulation`).
   */
  regulation?: Regulation | undefined;
  colorScheme?: ColorScheme | undefined;
  theme?: ThemeConfig | undefined;
  i18n?: I18nConfig | undefined;
  consentCategories?: ConsentCategory[] | undefined;
  /**
   * Define your own category taxonomy. Omit to get the built-in five
   * (necessary, functional, analytics, performance, advertisement) unchanged.
   * At least one category must be `{ required: true }`. Invalid configs fall
   * back to the built-in five with a console warning. See {@link CategoryDef}.
   */
  categories?: CategoryDef[] | undefined;
  networkBlocker?: NetworkBlockerConfig | undefined;
  reloadOnRevoke?: boolean | undefined;
  /**
   * Built-in, first-party integrations to stop cleanly (no reload) when their
   * category is revoked — e.g. `{ vendor: "meta" }`. (Google Analytics/Tag
   * Manager are handled automatically via the Consent Mode broadcast — no entry
   * needed.) Integrations with no clean runtime stop fall back to the reload notice.
   */
  integrations?: BuiltInIntegration[] | undefined;
  /**
   * Your own scripts' stop instructions, for anything without a built-in
   * integration. A handler that can stop cleanly provides `stop()`; one that
   * can't should be registered as a reload-only handler instead so revoking it
   * shows the reload notice rather than silently continuing to track.
   */
  customStopHandlers?: StopHandler[] | undefined;
  /** Low-level: fires once, after the runtime's initial state is known (e.g. to conditionally load analytics on first load). For ongoing updates, use `consentStore.subscribeToConsentChanges` instead. */
  onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
  /** Low-level: fires on every saved consent change, for the lifetime of this config. If you need to subscribe/unsubscribe dynamically after mount, use `consentStore.getState().subscribeToConsentChanges` instead. */
  onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
  /**
   * @deprecated Set `regulation` at the top level instead. This nested form
   * still works and maps to the top-level field; if both are given, the
   * top-level `regulation` wins. Retained for back-compat and removed after
   * three release cycles, per the SDK deprecation policy.
   */
  overrides?: { regulation?: Regulation | undefined } | undefined;
};

/**
 * Cookie-only mode — consent is stored client-side only; no backend keys are
 * permitted (they fail at the type level). `mode: "cookie-only"` is the
 * canonical value; `mode: "offline"` is a deprecated alias with identical
 * behavior that emits a one-time-per-page-load deprecation warning.
 */
export type CookieYesOfflineConfig = CookieYesConfigCommon & {
  mode: "cookie-only" | DeprecatedOfflineMode;
};

/** Self-hosted mode — consent decisions are persisted to your own backend. */
export type CookieYesSelfHostedConfig = CookieYesConfigCommon & {
  mode: "self-hosted";
  /** Endpoint the {@link ConsentPayload} is POSTed to. Canonical key. */
  apiUrl?: string | undefined;
  apiKey?: string | undefined;
  /** Custom persistence adapter — full control over transport/headers/retries. */
  backend?: ConsentBackend | undefined;
  /**
   * @deprecated Renamed to `apiUrl`. This alias still works and maps to
   * `apiUrl`; if both are given, `apiUrl` wins. Retained for back-compat and
   * removed after three release cycles, per the SDK deprecation policy.
   */
  backendURL?: string | undefined;
};

/**
 * The canonical configuration object for the CookieYes SDK, discriminated on
 * `mode`. Passed identically to `initCookieYes()` /
 * `getOrCreateConsentRuntime()` in `@cookieyes/core` and `initCookieYes()` in
 * `@cookieyes/react`.
 *
 * The discriminated union guarantees invalid combinations fail at compile time
 * — e.g. supplying `apiUrl`/`backend` under `mode: "cookie-only"` is a type error.
 */
export type CookieYesConfig = CookieYesOfflineConfig | CookieYesSelfHostedConfig;

/**
 * @deprecated Renamed to {@link CookieYesConfig}. Retained as a type alias for
 * back-compat and removed after three release cycles, per the SDK deprecation
 * policy.
 */
export type ConsentRuntimeOptions = CookieYesConfig;

export type ConsentChangePayload = {
  allowedCategories: ConsentCategory[];
  deniedCategories: ConsentCategory[];
};

export type ActiveUI = "banner" | "dialog" | null;

export type ConsentStoreState = ConsentSnapshot & {
  activeUI: ActiveUI;
  consents: Record<string, boolean>;
  has: (category: ConsentCategory) => boolean;
  saveConsents: (target: "all" | "necessary" | ConsentCategory[]) => Promise<void>;
  setConsent: (category: ConsentCategory, value: boolean) => void;
  /** Low-level: fires only on *saved* preference changes, not transient UI toggles — see `ConsentStore.subscribe` for the recommended, general-purpose subscription. */
  subscribeToConsentChanges: (listener: (payload: ConsentChangePayload) => void) => () => void;
};

/**
 * The recommended way to read consent state outside React. `subscribe` fires
 * on every state change (including transient UI toggles, e.g. a checkbox
 * flip before saving); for saved-changes-only, see
 * `ConsentStoreState.subscribeToConsentChanges`.
 */
export type ConsentStore = {
  subscribe: (listener: (state: ConsentStoreState) => void) => () => void;
  getState: () => ConsentStoreState;
};

export type ConsentRuntime = {
  consentManager: ConsentManager;
  consentStore: ConsentStore;
};
