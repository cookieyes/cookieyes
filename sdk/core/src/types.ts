import type { CategoryDef, ResolvedCategories } from "./categories.js";
import type { Integration, IntegrationDebugInfo } from "./integrations.js";
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

/** Display text for one consent category. */
export type CategoryText = { label: string; description: string };

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
  /** Shown in place of a toggle on a category marked `required: true`. */
  alwaysActive: string;
  /** Accessible name of the preferences dialog. */
  preferencesDialogLabel: string;
  /** Accessible name of the opt-out dialog. */
  optOutDialogLabel: string;
  /** Accessible name of the floating recall button. */
  recallButtonLabel: string;
  /** Accessible name of the banner's close button (rendered under CCPA only). */
  bannerCloseLabel: string;
  /** Accessible name of the preferences dialog's close button. */
  preferencesCloseLabel: string;
  /** Accessible name of the opt-out dialog's close button. */
  optOutCloseLabel: string;
  // The built-in five are always present; the index signature lets customers
  // translate their own custom categories by id, through the same system.
  categories: {
    necessary: CategoryText;
    functional: CategoryText;
    analytics: CategoryText;
    performance: CategoryText;
    advertisement: CategoryText;
  } & Record<string, CategoryText>;
  optOut: {
    title: string;
    description: string;
    cancel: string;
    successText: string;
    successCountdown: string;
  };
  gatedFrame: {
    /** Placeholder shown in place of blocked embedded content. `{category}` is substituted. */
    placeholder: string;
    /** Label of the placeholder's button, which opens the preferences dialog. */
    action: string;
  };
  reloadNotice: {
    message: string;
    reloadButton: string;
    dismissButton: string;
  };
};

/** A subset of TranslationMap — lets a customer override just a few strings. */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type PartialTranslations = DeepPartial<TranslationMap>;

/** Reading direction of a language. */
export type TextDirection = "ltr" | "rtl";

/** The active language, its reading direction, and the languages currently loaded. */
export type LanguageInfo = {
  language: string;
  direction: TextDirection;
  languages: string[];
};

/** Returns the visitor's region synchronously, e.g. "DE" or "US-CA" (or undefined). */
export type RegionDetector = () => string | undefined;

/** Optional geo-detection: pick the banner's regulation from the visitor's region. */
export type RegionConfig = {
  /** Return the visitor's region synchronously — e.g. from a hosting header you read. */
  detect?: RegionDetector | undefined;
  /** Which regulation each region maps to (you own this). Matched most-specific first: "US-CA" then "US". */
  map?: Record<string, Regulation> | undefined;
  /** Honour the browser's GPC "do not sell/share" signal (a CCPA opt-out). Default `true`. */
  honorGpc?: boolean | undefined;
  /** Regulation to apply when the region is unknown or detection fails. Default `"GDPR"`. */
  strictest?: Regulation | undefined;
  /** Log the region decision to the console at setup (for local debugging). Default `false`. */
  debug?: boolean | undefined;
};

/** How the active regulation was decided. */
export type RegionSource = "manual" | "detected" | "strictest";

/** The outcome of geo-detection — the region seen and the regulation chosen. */
export type RegionDecision = {
  region: string | undefined;
  regulation: Regulation;
  source: RegionSource;
  confidence: "high" | "low";
};

export type ThemeConfig = {
  primaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  mutedTextColor?: string | undefined;
  borderColor?: string | undefined;
  borderRadius?: string | undefined;
  fontFamily?: string | undefined;
  /**
   * Focus-ring color for interactive elements. Falls back to
   * `var(--cy-primary)` — the ring matches your brand color exactly like it
   * did before this field existed.
   */
  focusColor?: string | undefined;
  /**
   * Background color of the floating recall widget (the small circular
   * re-open button). Falls back to `"#0056a7"` in light mode. In dark mode,
   * this value is still respected if you set it; only when you don't set it
   * does a dark-mode default apply, the same way
   * backgroundColor/textColor/mutedTextColor/borderColor already work.
   */
  widgetBackgroundColor?: string | undefined;
};

export type ScriptEntry = {
  id: string;
  src: string;
  category: ConsentCategory;
  onLoad?: (() => void) | undefined;
};

export type I18nConfig = {
  /** Translations per language. Each may be partial — missing text falls back to English. */
  messages?: Record<string, PartialTranslations> | undefined;
  locale?: string | undefined;
  detectBrowserLanguage?: boolean | undefined;
  /**
   * Called when a language is switched to that isn't already in `messages` —
   * return its translations (fetch them from your own URL, import them, etc.).
   * Lets you load languages on demand instead of bundling them all upfront.
   */
  loadLanguage?: ((tag: string) => PartialTranslations | Promise<PartialTranslations>) | undefined;
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
   * How to combine multiple categories that map to the same Google Consent Mode
   * signal: `"any"` (default) grants the signal if any maps-and-granted; `"all"`
   * requires every mapping category. Only affects custom overlapping mappings.
   */
  googleConsentMatch?: "all" | "any" | undefined;
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
  /** Detected region (e.g. "US-CA"), recorded on the consent-log payload. */
  region?: string | undefined;
  /**
   * Internal — set by the runtime when a CCPA visitor arrives with the browser's
   * GPC "do not sell" signal on. Starts them opted out (non-required categories
   * off) until they explicitly choose otherwise, so nothing is shared first.
   */
  gpcOptOut?: boolean | undefined;
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
  /**
   * Consent in effect — changes only on a real decision (accept / reject / save
   * / reset), never on a dialog toggle. Gate scripts/embeds on this. (`categories`
   * is the live value that drives the dialog checkboxes.)
   */
  committedCategories: Record<string, boolean>;
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
  /** Detected region when geo-detection is on (e.g. "US-CA"); omitted otherwise. */
  region?: string | undefined;
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
 * `"offline"` still works but will be removed after three release cycles.
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
  /**
   * Optional geo-detection: choose the regulation from the visitor's region.
   * Fully optional — omit it and nothing changes. A manual `regulation` (above)
   * always wins over detection. See {@link RegionConfig}.
   */
  region?: RegionConfig | undefined;
  colorScheme?: ColorScheme | undefined;
  theme?: ThemeConfig | undefined;
  i18n?: I18nConfig | undefined;
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
   * How to combine multiple categories that map to the same Google Consent Mode
   * signal: `"any"` (default) or `"all"`. Only matters for a custom taxonomy
   * where more than one category maps to the same signal.
   */
  googleConsentMatch?: "all" | "any" | undefined;
  /**
   * Ready-made third-party integrations to gate behind consent — Segment, Meta,
   * Google, and more — using a preset from `@cookieyes/scripts`. Each preset
   * returns an {@link Integration}: it loads only once its category is granted
   * (or, for Google Consent Mode, loads immediately and denies by default), and
   * is removed or silenced on withdrawal.
   *
   * @example integrations: [segment({ writeKey: "..." })]
   */
  integrations?: Integration[] | undefined;
  /**
   * @deprecated Renamed from `integrations`. Built-in stop-handlers for a few
   * first-party vendors — e.g. `{ vendor: "meta" }` — stopped cleanly (no
   * reload) when their category is revoked. Prefer the new `integrations` field
   * with a preset from `@cookieyes/scripts`; this will be removed after three
   * release cycles.
   */
  builtInIntegrations?: BuiltInIntegration[] | undefined;
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

/** Which consent event to listen for. See {@link ConsentStore.on}. */
export type ConsentEventType = "save" | "change";

export type ConsentEventPayload = {
  /** The full committed consent map in effect when the event fired. */
  categories: Record<string, boolean>;
  /** Categories whose value differed from before. Empty on the initial replay. */
  changedCategories: ConsentCategory[];
  /**
   * `true` when this is the one-off replay a listener gets on attach (here's
   * the current state), `false` when the visitor actually just acted.
   */
  isInitial: boolean;
};

export type ConsentEventListener = (payload: ConsentEventPayload) => void;

/** Restrict a listener to a single category (fires only when it changes). */
export type ConsentEventOptions = { category?: ConsentCategory };

export type ActiveUI = "banner" | "dialog" | null;

export type ConsentStoreState = ConsentSnapshot & {
  activeUI: ActiveUI;
  /** Live/working values — reflect in-progress dialog toggles. Drive checkboxes. */
  consents: Record<string, boolean>;
  /**
   * Consent in effect — changes only on a saved decision, not a toggle. Gate
   * scripts/embeds on this (or {@link ConsentStoreState.has}).
   */
  committedConsents: Record<string, boolean>;
  /** True when `category` is committed-granted (a saved decision), not just toggled. */
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
  /** Text for the active language (English fills gaps). Swaps on `setLanguage`. */
  translations: TranslationMap;
  /** The active language, its reading direction, and the languages loaded. */
  getLanguageInfo: () => LanguageInfo;
  /**
   * Switch language live (no reload) — `subscribe` listeners fire so a custom UI
   * can re-render. Loads the language via `i18n.loadLanguage` if not bundled.
   */
  setLanguage: (tag: string) => Promise<void>;
  /** Customer-provided text for a category in the active language, if any. */
  getCategoryText: (id: string) => Partial<CategoryText> | undefined;
  /**
   * The category taxonomy in effect (custom list or the built-in five) — its
   * ids, which are `required`, etc. Use it to render categories in a custom UI
   * so it follows whatever taxonomy is configured.
   */
  categories: ResolvedCategories;
  /** How the active regulation was decided (region, source, confidence). */
  getRegion: () => RegionDecision;
  /**
   * React to consent decisions. `"save"` fires on every save (even an
   * unchanged re-confirm); `"change"` fires only when a category actually
   * differs — use it to (re)load a script without re-running on a re-confirm.
   * The listener fires once immediately with the current state
   * (`isInitial: true`). Pass `{ category }` to only hear about one category.
   * Returns an unsubscribe function.
   */
  on: (
    type: ConsentEventType,
    listener: ConsentEventListener,
    options?: ConsentEventOptions,
  ) => () => void;
};

export type ConsentRuntime = {
  consentManager: ConsentManager;
  consentStore: ConsentStore;
  /** Config + live status for each script integration — data for a debug view. */
  getIntegrations: () => IntegrationDebugInfo[];
};
