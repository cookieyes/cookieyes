import type { NetworkBlockerConfig } from "./network-blocker.js";

export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "performance"
  | "advertisement";

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
  theme?: ThemeConfig | undefined;
  colorScheme?: "light" | "dark" | "system" | undefined;
  reloadOnRevoke?: boolean | undefined;
  onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
  onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
};

export type ConsentSnapshot = {
  consentId: string;
  hasActed: boolean;
  categories: Record<ConsentCategory, boolean>;
  regulation: Regulation;
  lastRenewed?: number | undefined;
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
};

/**
 * Shape of the JSON body POSTed to the customer's `backendURL`
 * on every consent decision (Accept All / Reject All / Save Preferences).
 *
 * Customers building a TypeScript backend can import this type to get
 * full type safety on their request handler.
 */
export type ConsentPayload = {
  consentId: string;
  categories: Record<ConsentCategory, boolean>;
  regulation: Regulation;
  domain: string;
};

/**
 * Customer-implemented adapter that decides how a consent decision
 * reaches their backend. Provide this when `mode: "self-hosted"` and you
 * need full control over the request shape, headers, auth, transport,
 * batching, retries, etc. — anything you can't express with `backendURL`.
 *
 * The SDK hands you a standardised `ConsentPayload`; you transform and
 * dispatch it however your backend expects.
 */
export interface ConsentBackend {
  persist(payload: ConsentPayload): Promise<void> | void;
}

export type ConsentRuntimeMode = "self-hosted" | "offline";

export type ConsentRuntimeOptions = {
  mode: ConsentRuntimeMode;
  backendURL?: string | undefined;
  apiKey?: string | undefined;
  backend?: ConsentBackend | undefined;
  consentCategories?: ConsentCategory[] | undefined;
  overrides?:
    | {
        regulation?: Regulation | undefined;
      }
    | undefined;
  i18n?: I18nConfig | undefined;
  colorScheme?: "light" | "dark" | "system" | undefined;
  theme?: ThemeConfig | undefined;
  networkBlocker?: NetworkBlockerConfig | undefined;
  reloadOnRevoke?: boolean | undefined;
  onConsentReady?: ((state: ConsentSnapshot) => void) | undefined;
  onConsentUpdate?: ((state: ConsentSnapshot) => void) | undefined;
};

export type ConsentChangePayload = {
  allowedCategories: ConsentCategory[];
  deniedCategories: ConsentCategory[];
};

export type ActiveUI = "banner" | "dialog" | null;

export type ConsentStoreState = ConsentSnapshot & {
  activeUI: ActiveUI;
  consents: Record<ConsentCategory, boolean>;
  has: (category: ConsentCategory) => boolean;
  saveConsents: (target: "all" | "necessary" | ConsentCategory[]) => Promise<void>;
  setConsent: (category: ConsentCategory, value: boolean) => void;
  subscribeToConsentChanges: (listener: (payload: ConsentChangePayload) => void) => () => void;
};

export type ConsentStore = {
  subscribe: (listener: (state: ConsentStoreState) => void) => () => void;
  getState: () => ConsentStoreState;
};

export type ConsentRuntime = {
  consentManager: ConsentManager;
  consentStore: ConsentStore;
};
