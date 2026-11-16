import {
  type CategoryText,
  type ConsentEventListener,
  type ConsentEventOptions,
  type ConsentEventType,
  type ConsentManager,
  type ConsentSnapshot,
  type CookieYesConfig,
  type IntegrationDebugInfo,
  initCookieYes as initCoreRuntime,
  type LanguageInfo,
  type RegionDecision,
  type Regulation,
  type ReloadNoticeState,
  type ResolvedCategories,
  resetConsentRuntime,
  resolveRegion,
  type ScriptEntry,
  type ThemeConfig,
  type TranslationMap,
} from "@cookieyes/core";
import {
  activateDeferredStylesheets,
  loadThemeRuntime,
  warnOnStyleCspViolations,
} from "@cookieyes/ui";
import { type ShallowRef, shallowRef } from "vue";
import { warnOnUntestedVueVersion } from "./diagnostics/vue-version-warning.js";

/**
 * Declared locally rather than pulled in from `@types/node`: the guards below need
 * `process.env.NODE_ENV` to survive into the published output as that exact literal so a
 * consumer's bundler can replace it, and a Node type reference could reach the emitted `.d.ts`.
 */
declare const process: { env: { NODE_ENV?: string } };

/** Which colour scheme the banner follows. */
export type ColorSchemePref = "light" | "dark" | "system";

/** The consent state a component renders from. */
export type CookieYesSnapshot = ConsentSnapshot & {
  /** Consent in effect (changes only on Accept/Reject/Save). Use for gating. */
  committedCategories: Record<string, boolean>;
  isPreferencesOpen: boolean;
  isOptOutOpen: boolean;
  /** Banner closed without a decision (see `ConsentManager.dismissBanner`). */
  isBannerDismissed: boolean;
  reloadNotice: ReloadNoticeState;
};

export type { LanguageInfo } from "@cookieyes/core";

/** The runtime `app.use(CookieYes, config)` starts and the composables read. */
export type CookieYesRuntime = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CookieYesSnapshot;
  getServerSnapshot: () => CookieYesSnapshot;
  /** Internal: mirrors `getSnapshot()`; composables read this to react to changes. */
  state: ShallowRef<CookieYesSnapshot>;
  /** Internal: the config the runtime was built from, used to recognise a repeated install. */
  config: CookieYesConfig;
  manager: ConsentManager;
  /** Config and live status for each script integration, for a debug view. */
  getIntegrations: () => IntegrationDebugInfo[];
  /** Resolves once configured integrations have been loaded and wired up. */
  integrationsReady: Promise<void>;
  /** Text for the active language (English fills any gaps). Swaps on setLanguage. */
  translations: TranslationMap;
  getLanguageInfo: () => LanguageInfo;
  /** Switch language live; loads it via `i18n.loadLanguage` if not already present. */
  setLanguage: (tag: string) => Promise<void>;
  /** Customer-provided text for a category in the active language, if any. */
  getCategoryText: (id: string) => Partial<CategoryText> | undefined;
  /** How the active regulation was decided (region, source, confidence). */
  getRegion: () => RegionDecision;
  /** The resolved category taxonomy in effect. */
  categories: ResolvedCategories;
  theme: ThemeConfig | undefined;
  colorScheme: ColorSchemePref;
  registerScript: (entry: ScriptEntry) => void;
  showOptOut: () => void;
  hideOptOut: () => void;
  dismissReloadNotice: () => void;
  /**
   * React to consent decisions outside a component. `"save"` fires on every save, `"change"`
   * only when a category actually differs. Fires once immediately with the current state
   * (`isInitial: true`). Returns an unsubscribe function.
   */
  on: (
    type: ConsentEventType,
    listener: ConsentEventListener,
    options?: ConsentEventOptions,
  ) => () => void;
};

const PORTAL_ROOT_ID = "cookieyes-portal-root";

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & {
  __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] & { v?: number };
};

/**
 * Dev-only `forceRegion` reader for `@cookieyes/devtools`, client side. Unexported and with a
 * single call site so the bundler removes it together with its guarded caller in production.
 */
function readForcedRegion(): string | undefined {
  if (typeof document !== "undefined") {
    const match = /(?:^|;\s*)__cyd_region=([^;]*)/.exec(document.cookie);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        // A malformed cookie value is ignored rather than breaking setup.
        return undefined;
      }
    }
  }
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem("__cyd_region") ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const SSR_SNAPSHOT: CookieYesSnapshot = Object.freeze({
  consentId: "",
  hasActed: false,
  categories: Object.freeze({}) as Record<string, boolean>,
  committedCategories: Object.freeze({}) as Record<string, boolean>,
  regulation: "DEFAULT" as Regulation,
  isPreferencesOpen: false,
  isOptOutOpen: false,
  isBannerDismissed: false,
  reloadNotice: Object.freeze({ required: false, reasons: [] }) as ReloadNoticeState,
}) as CookieYesSnapshot;

let _instance: CookieYesRuntime | null = null;

/**
 * @internal Builds the runtime over core's and registers it for `getCookieYes()`. Always resets
 * core first: core keeps the first runtime and ignores a later config, and resetting also
 * uninstalls the network blocker, which the next init would otherwise silently never replace.
 */
export function _createRuntime(config: CookieYesConfig): CookieYesRuntime {
  if (config.mode === "self-hosted" && !config.backend && !config.apiUrl && !config.backendURL) {
    throw new Error(
      '[cookieyes] mode "self-hosted" requires either backend or apiUrl in the config.',
    );
  }

  resetConsentRuntime();

  // Dev-only `forceRegion` override. Core's runtime has no such input, so the decision is made
  // here and reported by the facade; core's manager keeps the unforced regulation.
  const forcedRegion = process.env.NODE_ENV !== "production" ? readForcedRegion() : undefined;
  const manualRegulation = config.regulation ?? config.overrides?.regulation;

  if (process.env.NODE_ENV !== "production") {
    const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], { v: 1 }));
    if (q.length >= 500) q.shift();
    q.push({ k: "r", t: Date.now(), d: { region: config.region, regulation: manualRegulation } });
    warnOnStyleCspViolations();
    warnOnUntestedVueVersion();
  }

  const core = initCoreRuntime(config);
  const { consentManager: manager, consentStore: store } = core;

  const regionDecision: RegionDecision =
    forcedRegion !== undefined && config.region
      ? resolveRegion(config.region, manualRegulation, forcedRegion)
      : store.getRegion();

  const colorScheme: ColorSchemePref = config.colorScheme ?? "system";
  if (config.theme) void loadThemeRuntime();
  activateDeferredStylesheets();

  const listeners = new Set<() => void>();
  let isOptOutOpen = false;

  function buildSnapshot(): CookieYesSnapshot {
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories: manager.categories,
      committedCategories: manager.committedCategories,
      regulation: forcedRegion !== undefined ? regionDecision.regulation : manager.regulation,
      lastRenewed: manager.lastRenewed,
      taxonomyHash: manager.taxonomyHash,
      isPreferencesOpen: manager.isPreferencesOpen,
      isOptOutOpen,
      isBannerDismissed: manager.isBannerDismissed,
      reloadNotice: manager.reloadNotice,
    };
  }

  let cachedSnapshot = buildSnapshot();
  const state = shallowRef(cachedSnapshot);
  function notify(): void {
    cachedSnapshot = buildSnapshot();
    state.value = cachedSnapshot;
    for (const fn of listeners) fn();
  }
  store.subscribe(notify);

  // A fresh visitor as the server sees it: required categories on, the rest on only under CCPA,
  // which is opt-out. Uses the unforced decision because the server never saw the dev override
  // cookie, so hydration matches the server's markup and the live snapshot then switches.
  const serverRegulation = store.getRegion().regulation;
  const ssrCategories: Record<string, boolean> = {};
  for (const id of store.categories.ids) {
    ssrCategories[id] = store.categories.requiredIds.has(id) ? true : serverRegulation === "CCPA";
  }
  const ssrSnapshot: CookieYesSnapshot = Object.freeze({
    ...SSR_SNAPSHOT,
    regulation: serverRegulation,
    categories: Object.freeze(ssrCategories) as Record<string, boolean>,
    committedCategories: Object.freeze({ ...ssrCategories }) as Record<string, boolean>,
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
    state,
    config,
    manager,
    getIntegrations: core.getIntegrations,
    get integrationsReady() {
      return core.integrationsReady;
    },
    get translations() {
      return store.translations;
    },
    getLanguageInfo: store.getLanguageInfo,
    setLanguage: store.setLanguage,
    getCategoryText: store.getCategoryText,
    getRegion: () => regionDecision,
    categories: store.categories,
    theme: config.theme,
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
    dismissReloadNotice: () => manager.dismissReloadNotice(),
    on: (type, listener, options) => store.on(type, listener, options),
  };

  _instance = runtime;
  return runtime;
}

/**
 * The runtime started by `app.use(CookieYes, config)`, for code outside components such as a
 * router guard, a Pinia store or a plain module. Inside a component prefer the composables.
 * Throws when the plugin has not run.
 */
export function getCookieYes(): CookieYesRuntime {
  if (!_instance) {
    throw new Error(
      "[cookieyes] getCookieYes() found no runtime. Install the plugin first: app.use(CookieYes, config).",
    );
  }
  return _instance;
}

/** @internal Null on the server or before the plugin ran. */
export function _tryGetCookieYes(): CookieYesRuntime | null {
  return _instance;
}

/**
 * Drops the runtime and resets core's, so the next `app.use(CookieYes, config)` starts fresh.
 * Use this instead of core's `resetConsentRuntime`, which leaves `getCookieYes()` pointing at a
 * dropped manager. An empty portal root is removed, as the vanilla widget does on destroy.
 */
export function resetCookieYes(): void {
  resetConsentRuntime();
  _instance = null;
  if (typeof document !== "undefined") {
    const root = document.getElementById(PORTAL_ROOT_ID);
    if (root && root.childNodes.length === 0) root.remove();
  }
}
