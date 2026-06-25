"use client";

import type { NetworkBlockerConfig } from "@cookieyes/core";
import {
  type ConsentBackend,
  type ConsentCategory,
  type ConsentConfig,
  type ConsentManager,
  type ConsentSnapshot,
  createConsentManager,
  type I18nConfig,
  installNetworkBlocker,
  type Regulation,
  resolveTranslations,
  type ScriptEntry,
  type ThemeConfig,
  type TranslationMap,
} from "@cookieyes/core";
import { injectStyles } from "./styles/inject.js";

export type RuntimeMode = "offline" | "self-hosted";
export type ColorSchemePref = "light" | "dark" | "system";

type RuntimeConfig = {
  mode?: RuntimeMode;
  regulation?: Regulation;
  i18n?: I18nConfig;
  theme?: ThemeConfig;
  colorScheme?: ColorSchemePref;
  backend?: ConsentBackend;
  backendURL?: string;
  apiKey?: string;
  networkBlocker?: NetworkBlockerConfig;
  reloadOnRevoke?: boolean;
  onConsentReady?: (state: ConsentSnapshot) => void;
  onConsentUpdate?: (state: ConsentSnapshot) => void;
};

export type CookieYesSnapshot = ConsentSnapshot & {
  isPreferencesOpen: boolean;
  isOptOutOpen: boolean;
};

export type CookieYesRuntime = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CookieYesSnapshot;
  getServerSnapshot: () => CookieYesSnapshot;
  manager: ConsentManager;
  translations: TranslationMap;
  theme: ThemeConfig | undefined;
  colorScheme: ColorSchemePref;
  registerScript: (entry: ScriptEntry) => void;
  showOptOut: () => void;
  hideOptOut: () => void;
};

export type Builder = {
  mode: (m: RuntimeMode) => Builder;
  regulation: (r: Regulation) => Builder;
  i18n: (i: I18nConfig) => Builder;
  theme: (t: ThemeConfig) => Builder;
  colorScheme: (s: ColorSchemePref) => Builder;
  backend: (b: ConsentBackend) => Builder;
  backendURL: (url: string) => Builder;
  apiKey: (key: string) => Builder;
  blockNetwork: (config: NetworkBlockerConfig) => Builder;
  reloadOnRevoke: (value?: boolean) => Builder;
  onConsentReady: (fn: (state: ConsentSnapshot) => void) => Builder;
  onConsentUpdate: (fn: (state: ConsentSnapshot) => void) => Builder;
  mount: () => CookieYesRuntime;
};

function makeBuilder(cfg: RuntimeConfig): Builder {
  const next = (extra: Partial<RuntimeConfig>): Builder => makeBuilder({ ...cfg, ...extra });

  return {
    mode: (m) => next({ mode: m }),
    regulation: (r) => next({ regulation: r }),
    i18n: (i) => next({ i18n: i }),
    theme: (t) => next({ theme: t }),
    colorScheme: (s) => next({ colorScheme: s }),
    backend: (b) => next({ backend: b }),
    backendURL: (url) => next({ backendURL: url }),
    apiKey: (key) => next({ apiKey: key }),
    blockNetwork: (config) => next({ networkBlocker: config }),
    reloadOnRevoke: (value = true) => next({ reloadOnRevoke: value }),
    onConsentReady: (fn) => next({ onConsentReady: fn }),
    onConsentUpdate: (fn) => next({ onConsentUpdate: fn }),
    mount: () => mountRuntime(cfg),
  };
}

export function createCookieYes(): Builder {
  return makeBuilder({});
}

const SSR_SNAPSHOT: CookieYesSnapshot = Object.freeze({
  consentId: "",
  hasActed: false,
  categories: Object.freeze({
    necessary: true,
    functional: false,
    analytics: false,
    performance: false,
    advertisement: false,
  }) as Record<ConsentCategory, boolean>,
  regulation: "DEFAULT" as Regulation,
  isPreferencesOpen: false,
  isOptOutOpen: false,
}) as CookieYesSnapshot;

let _instance: CookieYesRuntime | null = null;

function mountRuntime(cfg: RuntimeConfig): CookieYesRuntime {
  if (!cfg.mode) {
    throw new Error(
      "createCookieYes(): .mode() is required before .mount(). " +
        "Call .mode('offline') or .mode('self-hosted').",
    );
  }
  if (cfg.mode === "self-hosted" && !cfg.backend && !cfg.backendURL) {
    throw new Error(
      "createCookieYes(): .mode('self-hosted') requires either .backend(...) or .backendURL(...).",
    );
  }

  const coreCfg: ConsentConfig = {};
  if (cfg.mode === "self-hosted") {
    if (cfg.backend) coreCfg.backend = cfg.backend;
    else if (cfg.backendURL) coreCfg.apiUrl = cfg.backendURL;
    if (cfg.apiKey) coreCfg.apiKey = cfg.apiKey;
  }
  if (cfg.regulation) coreCfg.regulation = cfg.regulation;
  if (cfg.theme) coreCfg.theme = cfg.theme;
  if (cfg.colorScheme) coreCfg.colorScheme = cfg.colorScheme;
  if (cfg.reloadOnRevoke) coreCfg.reloadOnRevoke = cfg.reloadOnRevoke;
  if (cfg.onConsentReady) coreCfg.onConsentReady = cfg.onConsentReady;
  if (cfg.onConsentUpdate) coreCfg.onConsentUpdate = cfg.onConsentUpdate;

  const manager = createConsentManager(coreCfg);
  const listeners = new Set<() => void>();
  let isOptOutOpen = false;

  function buildSnapshot(): CookieYesSnapshot {
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories: manager.categories,
      regulation: manager.regulation,
      lastRenewed: manager.lastRenewed,
      isPreferencesOpen: manager.isPreferencesOpen,
      isOptOutOpen,
    };
  }

  let cachedSnapshot = buildSnapshot();
  function notify(): void {
    cachedSnapshot = buildSnapshot();
    for (const fn of listeners) fn();
  }

  manager.subscribe(notify);

  if (cfg.networkBlocker && cfg.networkBlocker.rules.length > 0) {
    installNetworkBlocker(cfg.networkBlocker, (cat) => manager.categories[cat] === true);
  }

  const colorScheme = cfg.colorScheme ?? "system";
  injectStyles(cfg.theme, colorScheme);

  // Per-mount SSR snapshot: a fresh-visitor state (banner visible, dialogs
  // closed) carrying the *configured* regulation so server-rendered markup
  // matches the client's first hydration render (no GDPR/CCPA mismatch).
  const ssrSnapshot: CookieYesSnapshot = Object.freeze({
    ...SSR_SNAPSHOT,
    regulation: (cfg.regulation ?? "DEFAULT") as Regulation,
  }) as CookieYesSnapshot;

  const runtime: CookieYesRuntime = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => cachedSnapshot,
    getServerSnapshot: () => ssrSnapshot,
    manager,
    translations: resolveTranslations(cfg.i18n),
    theme: cfg.theme,
    colorScheme,
    registerScript: (entry) => manager.registerScript(entry),
    showOptOut: () => {
      if (isOptOutOpen) return;
      isOptOutOpen = true;
      notify();
    },
    hideOptOut: () => {
      if (!isOptOutOpen) return;
      isOptOutOpen = false;
      notify();
    },
  };

  if (_instance && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "[cookieyes] createCookieYes().mount() called more than once. " +
        "Replacing the previous runtime.",
    );
  }
  _instance = runtime;
  return runtime;
}

export function getCookieYes(): CookieYesRuntime {
  if (!_instance) {
    throw new Error(
      "[cookieyes] No runtime is registered. " +
        "Call createCookieYes().mode(...).mount() in a 'use client' module before using hooks or components.",
    );
  }
  return _instance;
}

/** @internal — null on the server (or when no runtime is mounted yet). Hooks use this for SSR-safe fallback to SSR_SNAPSHOT. */
export function _tryGetCookieYes(): CookieYesRuntime | null {
  return _instance;
}

/** @internal — exported so SSR-tolerant hooks can return a consistent snapshot when no runtime is mounted. */
export { SSR_SNAPSHOT as _SSR_SNAPSHOT };

/** @internal — stable noop subscribe for useSyncExternalStore when no runtime is mounted. */
export const _noopSubscribe = (): (() => void) => () => undefined;

export function resetCookieYes(): void {
  _instance = null;
}
