"use client";

import {
  installNetworkBlocker,
  _loadIntegrations,
  _logRegionDecision,
  _normalizeConfig,
  _warnBuiltInIntegrationsDeprecated,
  _warnOfflineModeDeprecated,
  type BuiltInIntegration,
  type CategoryDef,
  type CategoryText,
  type ConsentBackend,
  type ConsentConfig,
  type ConsentEmitter,
  type ConsentEventListener,
  type ConsentEventOptions,
  type ConsentEventType,
  type ConsentManager,
  type ConsentSnapshot,
  type CookieYesConfig,
  createConsentEmitter,
  createConsentManager,
  createLanguageController,
  type I18nConfig,
  type Integration,
  type IntegrationDebugInfo,
  type IntegrationRunner,
  type LanguageInfo,
  type NetworkBlockerConfig,
  type RegionConfig,
  type RegionDecision,
  type Regulation,
  type ReloadNoticeState,
  type ResolvedCategories,
  readGpc,
  resolveCategories,
  resolveRegion,
  type ScriptEntry,
  type StopHandler,
  type ThemeConfig,
  type TranslationMap,
} from "@cookieyes/core";
import { warnOnUntestedReactVersion } from "./diagnostics/peer-version-warning.js";
import { warnOnStyleCspViolations } from "./styles/csp-warning.js";

/**
 * @deprecated Use `"cookie-only"` instead — identical behavior, clearer name.
 * `"offline"` still works but will be removed after three release cycles.
 */
type DeprecatedOfflineMode = "offline";

export type RuntimeMode = "cookie-only" | "self-hosted" | DeprecatedOfflineMode;
export type ColorSchemePref = "light" | "dark" | "system";

/** True when a CCPA visitor's browser sends GPC and we're set to honour it. */
function wantsGpcOptOut(regulation: Regulation, region: RegionConfig | undefined): boolean {
  return regulation === "CCPA" && (region?.honorGpc ?? true) && readGpc();
}

type RuntimeConfig = {
  mode?: RuntimeMode;
  regulation?: Regulation;
  region?: RegionConfig;
  i18n?: I18nConfig;
  theme?: ThemeConfig;
  colorScheme?: ColorSchemePref;
  backend?: ConsentBackend;
  backendURL?: string;
  apiKey?: string;
  networkBlocker?: NetworkBlockerConfig;
  reloadOnRevoke?: boolean;
  googleConsentMatch?: "all" | "any";
  integrations?: Integration[];
  builtInIntegrations?: BuiltInIntegration[];
  customStopHandlers?: StopHandler[];
  categories?: CategoryDef[];
  onConsentReady?: (state: ConsentSnapshot) => void;
  onConsentUpdate?: (state: ConsentSnapshot) => void;
};

export type CookieYesSnapshot = ConsentSnapshot & {
  /** Consent in effect (changes only on Accept/Reject/Save) — use for gating. */
  committedCategories: Record<string, boolean>;
  isPreferencesOpen: boolean;
  isOptOutOpen: boolean;
  reloadNotice: ReloadNoticeState;
};

export type { LanguageInfo } from "@cookieyes/core";

export type CookieYesRuntime = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CookieYesSnapshot;
  getServerSnapshot: () => CookieYesSnapshot;
  manager: ConsentManager;
  /** Config + live status for each script integration — data for a debug view. */
  getIntegrations: () => IntegrationDebugInfo[];
  /**
   * Resolves once configured integrations have been loaded and wired up. The
   * runner is loaded on demand, so `getIntegrations()` returns `[]` for a short
   * window after mount. Resolves immediately when none are configured. See the
   * same field on `@cookieyes/core`'s `ConsentRuntime`.
   */
  integrationsReady: Promise<void>;
  /** Text for the active language (English fills any gaps). Reactive — swaps on setLanguage. */
  translations: TranslationMap;
  getLanguageInfo: () => LanguageInfo;
  /** Switch language live; loads it via `i18n.loadLanguage` if not already present. */
  setLanguage: (tag: string) => Promise<void>;
  /** Customer-provided text for a category in the active language, if any. */
  getCategoryText: (id: string) => Partial<CategoryText> | undefined;
  /** How the active regulation was decided (region, source, confidence). */
  getRegion: () => RegionDecision;
  /** The resolved category taxonomy in effect (built-in five or the customer's). */
  categories: ResolvedCategories;
  theme: ThemeConfig | undefined;
  colorScheme: ColorSchemePref;
  registerScript: (entry: ScriptEntry) => void;
  showOptOut: () => void;
  hideOptOut: () => void;
  dismissReloadNotice: () => void;
  /**
   * React to consent decisions outside render. `"save"` fires on every save,
   * `"change"` only when a category actually differs. Fires once immediately
   * with the current state (`isInitial: true`); pass `{ category }` to hear
   * about one category. Returns an unsubscribe function. Inside a component,
   * prefer the `useOnConsentChange` hook.
   */
  on: (
    type: ConsentEventType,
    listener: ConsentEventListener,
    options?: ConsentEventOptions,
  ) => () => void;
};

/**
 * @deprecated The chainable builder is deprecated in favour of
 * {@link initCookieYes}, which takes one canonical `CookieYesConfig` object.
 * The builder still works but will be removed after three release cycles, per
 * the SDK deprecation policy. Migration guide:
 * https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx
 */
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
  /** Stop these built-in integrations cleanly (no reload) when their category is revoked. */
  integrations: (list: BuiltInIntegration[]) => Builder;
  /** Register stop instructions for your own scripts (see `StopHandler`). */
  customStopHandlers: (list: StopHandler[]) => Builder;
  /** Define your own category taxonomy. Omit for the built-in five (see `CategoryDef`). */
  categories: (list: CategoryDef[]) => Builder;
  /** Low-level: fires once, after initial state is known. Prefer `useConsent()` for ongoing reads inside a component. */
  onConsentReady: (fn: (state: ConsentSnapshot) => void) => Builder;
  /** Low-level: fires on every *saved* change only (not transient toggles), registered once here. For dynamic subscribe/unsubscribe, use `useConsentRuntime()`. */
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
    integrations: (list) => next({ builtInIntegrations: list }),
    customStopHandlers: (list) => next({ customStopHandlers: list }),
    categories: (list) => next({ categories: list }),
    onConsentReady: (fn) => next({ onConsentReady: fn }),
    onConsentUpdate: (fn) => next({ onConsentUpdate: fn }),
    mount: () => mountRuntime(cfg),
  };
}

/**
 * Declared locally rather than pulled in from `@types/node`.
 *
 * The guard below needs `process.env.NODE_ENV` to survive into the published
 * output as that exact literal, so a consumer's bundler can replace it. That
 * rules out any defensive form — `globalThis.process?.env?.NODE_ENV`, a
 * `typeof` check — because none of them are the pattern bundlers match.
 *
 * Referencing Node's global types instead (`/// <reference types="node" />`)
 * would work for the compiler but risks that reference reaching the emitted
 * `.d.ts`, which would make every consumer of this package need `@types/node`
 * to typecheck. This declaration is module-scoped and ambient, so it types the
 * one expression that needs it and reaches nothing else.
 */
declare const process: { env: { NODE_ENV?: string } };

let _builderDeprecationWarned = false;

/**
 * No-op in a production bundle. The literal `process.env.NODE_ENV` check is the
 * form bundlers replace, which makes the early return unconditional and the
 * message below dead code; see the note at the top of
 * `@cookieyes/core`'s `deprecations.ts` for why it is written this exact way
 * and not hoisted into a shared constant.
 */
function warnBuilderDeprecated(): void {
  if (process.env.NODE_ENV === "production") return;
  if (_builderDeprecationWarned) return;
  _builderDeprecationWarned = true;
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "[CookieYes] `createCookieYes()` (the builder) is deprecated. Configure the " +
        "SDK with `initCookieYes(config)` — one canonical config object instead of a " +
        "chain. The builder will be removed after three release cycles, per the SDK " +
        "deprecation policy. Migration guide: " +
        "https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx",
    );
  }
}

/**
 * @deprecated Use {@link initCookieYes} with a canonical `CookieYesConfig`
 * object instead of the builder chain. Still functional, but removed after
 * three release cycles per the SDK deprecation policy. Migration guide:
 * https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/migration.mdx
 */
export function createCookieYes(): Builder {
  warnBuilderDeprecated();
  return makeBuilder({});
}

/**
 * Canonical setup entry point for `@cookieyes/react`. Accepts the exact same
 * {@link CookieYesConfig} as `@cookieyes/core` — a config object is
 * copy-pasteable between the two packages with zero edits.
 *
 * After a single call, `<CookieBanner />`, `<CookiePreferences />` and every
 * hook (`useConsent()` etc.) wire up automatically against the registered
 * runtime — no further setup required.
 */
export function initCookieYes(config: CookieYesConfig): CookieYesRuntime {
  const n = _normalizeConfig(config);
  const cfg: RuntimeConfig = { mode: n.mode };
  if (n.regulation !== undefined) cfg.regulation = n.regulation;
  if (n.region !== undefined) cfg.region = n.region;
  if (n.i18n !== undefined) cfg.i18n = n.i18n;
  if (n.theme !== undefined) cfg.theme = n.theme;
  if (n.colorScheme !== undefined) cfg.colorScheme = n.colorScheme;
  if (n.backend !== undefined) cfg.backend = n.backend;
  if (n.apiUrl !== undefined) cfg.backendURL = n.apiUrl;
  if (n.apiKey !== undefined) cfg.apiKey = n.apiKey;
  if (n.networkBlocker !== undefined) cfg.networkBlocker = n.networkBlocker;
  if (n.reloadOnRevoke !== undefined) cfg.reloadOnRevoke = n.reloadOnRevoke;
  if (n.googleConsentMatch !== undefined) cfg.googleConsentMatch = n.googleConsentMatch;
  if (n.integrations !== undefined) cfg.integrations = n.integrations;
  if (n.builtInIntegrations !== undefined) cfg.builtInIntegrations = n.builtInIntegrations;
  if (n.customStopHandlers !== undefined) cfg.customStopHandlers = n.customStopHandlers;
  if (n.categories !== undefined) cfg.categories = n.categories;
  if (n.onConsentReady !== undefined) cfg.onConsentReady = n.onConsentReady;
  if (n.onConsentUpdate !== undefined) cfg.onConsentUpdate = n.onConsentUpdate;
  return mountRuntime(cfg);
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
  }) as Record<string, boolean>,
  committedCategories: Object.freeze({
    necessary: true,
    functional: false,
    analytics: false,
    performance: false,
    advertisement: false,
  }) as Record<string, boolean>,
  regulation: "DEFAULT" as Regulation,
  isPreferencesOpen: false,
  isOptOutOpen: false,
  reloadNotice: Object.freeze({ required: false, reasons: [] }) as ReloadNoticeState,
}) as CookieYesSnapshot;

let _instance: CookieYesRuntime | null = null;
let _integrationRunner: IntegrationRunner | null = null;
/** Guards an in-flight integration load against a re-mount or reset. */
let _integrationGeneration = 0;

function mountRuntime(cfg: RuntimeConfig): CookieYesRuntime {
  if (!cfg.mode) {
    throw new Error(
      "createCookieYes(): .mode() is required before .mount(). " +
        "Call .mode('cookie-only') or .mode('self-hosted').",
    );
  }
  if (cfg.mode === "offline") _warnOfflineModeDeprecated();
  if (cfg.mode === "self-hosted" && !cfg.backend && !cfg.backendURL) {
    throw new Error(
      "createCookieYes(): .mode('self-hosted') requires either .backend(...) or .backendURL(...).",
    );
  }

  // Geo-detection if configured, else the manual/default regulation. Drives the
  // banner and the SSR snapshot so the first paint matches.
  const regionDecision: RegionDecision = cfg.region
    ? resolveRegion(cfg.region, cfg.regulation)
    : {
        region: undefined,
        regulation: cfg.regulation ?? "DEFAULT",
        source: "manual",
        confidence: "high",
      };

  const coreCfg: ConsentConfig = {};
  if (cfg.mode === "self-hosted") {
    if (cfg.backend) coreCfg.backend = cfg.backend;
    else if (cfg.backendURL) coreCfg.apiUrl = cfg.backendURL;
    if (cfg.apiKey) coreCfg.apiKey = cfg.apiKey;
  }
  coreCfg.regulation = regionDecision.regulation;
  if (regionDecision.region) coreCfg.region = regionDecision.region;
  // GPC "do not sell" on a CCPA banner → start opted out (client only; GPC never
  // changes which banner shows). See core's manager for how the flag is applied.
  const gpcOptOut = wantsGpcOptOut(regionDecision.regulation, cfg.region);
  if (gpcOptOut) coreCfg.gpcOptOut = true;
  if (cfg.region?.debug) _logRegionDecision(regionDecision, gpcOptOut);
  if (cfg.theme) coreCfg.theme = cfg.theme;
  if (cfg.colorScheme) coreCfg.colorScheme = cfg.colorScheme;
  if (cfg.reloadOnRevoke) coreCfg.reloadOnRevoke = cfg.reloadOnRevoke;
  if (cfg.googleConsentMatch) coreCfg.googleConsentMatch = cfg.googleConsentMatch;
  if (cfg.builtInIntegrations && cfg.builtInIntegrations.length > 0) {
    _warnBuiltInIntegrationsDeprecated();
    coreCfg.integrations = cfg.builtInIntegrations;
  }
  if (cfg.customStopHandlers) coreCfg.customStopHandlers = cfg.customStopHandlers;
  if (cfg.categories) coreCfg.categories = cfg.categories;
  if (cfg.onConsentReady) coreCfg.onConsentReady = cfg.onConsentReady;

  // Feed the event emitter on every save, alongside the user's own callback.
  // `emitter` is assigned right after the manager exists; onConsentUpdate can't
  // fire until the visitor acts (post-init), so the forward reference is safe.
  const userOnConsentUpdate = cfg.onConsentUpdate;
  let emitter: ConsentEmitter;
  coreCfg.onConsentUpdate = (state) => {
    userOnConsentUpdate?.(state);
    emitter.push(state.categories);
  };

  const manager = createConsentManager(coreCfg);
  emitter = createConsentEmitter(() => manager.committedCategories);
  // Same resolution the manager uses internally — so the UI iterates exactly
  // the taxonomy that's in effect (custom, or the built-in five fallback).
  const resolved = resolveCategories(cfg.categories);
  const listeners = new Set<() => void>();
  let isOptOutOpen = false;

  function buildSnapshot(): CookieYesSnapshot {
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories: manager.categories,
      committedCategories: manager.committedCategories,
      regulation: manager.regulation,
      lastRenewed: manager.lastRenewed,
      taxonomyHash: manager.taxonomyHash,
      isPreferencesOpen: manager.isPreferencesOpen,
      isOptOutOpen,
      reloadNotice: manager.reloadNotice,
    };
  }

  let cachedSnapshot = buildSnapshot();
  function notify(): void {
    cachedSnapshot = buildSnapshot();
    for (const fn of listeners) fn();
  }

  manager.subscribe(notify);

  if (cfg.networkBlocker && cfg.networkBlocker.rules.length > 0) {
    // Gate on committed consent, not the live toggle — an unsaved switch flip
    // must not open the network before the visitor actually consents.
    installNetworkBlocker(cfg.networkBlocker, (cat) => manager.committedCategories[cat] === true);
  }

  // Both are developer diagnostics: a CSP-violation listener and an
  // untested-React-version warning. Neither does anything a visitor can act on,
  // and guarding the *call sites* (rather than the function bodies) is what
  // makes them removable — with nothing referencing them, the bundler drops the
  // functions and their message strings entirely rather than keeping empty
  // shells. See the note in `@cookieyes/core`'s `deprecations.ts` for why the
  // check is written as this exact literal.
  if (process.env.NODE_ENV !== "production") {
    warnOnStyleCspViolations();
    warnOnUntestedReactVersion();
  }

  // Owns the active language + live switching; re-renders the UI via notify.
  const language = createLanguageController(cfg.i18n, notify);

  const colorScheme = cfg.colorScheme ?? "system";

  // Per-mount SSR snapshot: a fresh-visitor state (banner visible, dialogs
  // closed) carrying the *configured* regulation and the *resolved* taxonomy's
  // fresh-visitor category map — so server markup matches the client's first
  // hydration render (no regulation or category-shape mismatch), including for
  // custom taxonomies. CCPA is opt-out (everything on); otherwise only the
  // required category(ies) start on. Mirrors core's defaultSnapshot.
  const ssrRegulation = regionDecision.regulation;
  const ssrOptOut = ssrRegulation === "CCPA";
  const ssrCategories: Record<string, boolean> = {};
  for (const id of resolved.ids) {
    ssrCategories[id] = resolved.requiredIds.has(id) ? true : ssrOptOut;
  }
  const ssrSnapshot: CookieYesSnapshot = Object.freeze({
    ...SSR_SNAPSHOT,
    regulation: ssrRegulation,
    categories: Object.freeze(ssrCategories) as Record<string, boolean>,
    committedCategories: Object.freeze({ ...ssrCategories }) as Record<string, boolean>,
  }) as CookieYesSnapshot;

  // Assigned by the integration block further down, which runs after this
  // object is built. Exposed through a getter so that late assignment is
  // visible to a caller holding the runtime.
  let integrationsReady: Promise<void> = Promise.resolve();

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
    getIntegrations: () => _integrationRunner?.list() ?? [],
    get integrationsReady() {
      return integrationsReady;
    },
    get translations() {
      return language.getTranslations();
    },
    getLanguageInfo: language.getLanguageInfo,
    setLanguage: language.setLanguage,
    getCategoryText: language.getCategoryText,
    categories: resolved,
    getRegion: () => regionDecision,
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
    dismissReloadNotice: () => manager.dismissReloadNotice(),
    on: (type, listener, opts) => emitter.on(type, listener, opts),
  };

  if (_instance && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      "[cookieyes] initCookieYes() called more than once. " + "Replacing the previous runtime.",
    );
  }
  // Run the configured script integrations (Segment, Google, Meta, …) against
  // the committed consent. A re-mount replaces the previous runner.
  _integrationRunner?.stop();
  _integrationRunner = null;
  // Invalidate any in-flight load before starting a new one, so a chunk still
  // on its way for the previous mount cannot install itself against this one.
  const generation = ++_integrationGeneration;
  if (cfg.integrations && cfg.integrations.length > 0) {
    const configured = cfg.integrations;
    const builtIn = cfg.builtInIntegrations ?? [];
    // Loaded on demand through core's `_loadIntegrations`, which keeps the
    // runner out of the initial download. A static import of `runIntegrations`
    // here would pull it straight back in — that is exactly what this adapter
    // used to do, and why splitting it in core alone changed the interface
    // layer's measurement by nothing.
    integrationsReady = _loadIntegrations().then((m) => {
      if (generation !== _integrationGeneration) return;
      m.warnOverlappingVendors(
        configured.map((i) => i.id),
        builtIn.map((b) => b.vendor),
      );
      m.warnUnknownCategories(configured, Object.keys(manager.committedCategories));
      _integrationRunner = m.runIntegrations(configured, {
        granted: (category) => manager.committedCategories[category] === true,
        subscribe: (fn) => manager.subscribe(() => fn()),
        region: regionDecision,
      });
    });
  }

  _instance = runtime;
  return runtime;
}

/**
 * Low-level: imperative, non-hook access to the mounted runtime — for use
 * outside React components/render (event handlers, non-component modules).
 * Inside a component, prefer `useConsent()` or `useConsentActions()`.
 */
export function getCookieYes(): CookieYesRuntime {
  if (!_instance) {
    throw new Error(
      "[cookieyes] No runtime is registered. " +
        "Call initCookieYes(...) in a 'use client' module before using hooks or components.",
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
  _integrationRunner?.stop();
  _integrationRunner = null;
  _instance = null;
  _builderDeprecationWarned = false;
}
