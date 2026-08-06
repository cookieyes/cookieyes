import { resolveCategories } from "./categories.js";
import { _normalizeConfig } from "./config.js";
import { _warnOfflineModeDeprecated } from "./deprecations.js";
import { type ConsentEmitter, createConsentEmitter } from "./events.js";
import { createLanguageController } from "./language.js";
import { createConsentManager } from "./manager.js";
import { installNetworkBlocker } from "./network-blocker.js";
import { _logRegionDecision, readGpc, resolveRegion } from "./region.js";
import type {
  ActiveUI,
  ConsentCategory,
  ConsentChangePayload,
  ConsentConfig,
  ConsentRuntime,
  ConsentStore,
  ConsentStoreState,
  CookieYesConfig,
  RegionConfig,
  RegionDecision,
  Regulation,
} from "./types.js";

/** True when a CCPA visitor's browser sends GPC and we're set to honour it. */
function wantsGpcOptOut(regulation: Regulation, region: RegionConfig | undefined): boolean {
  return regulation === "CCPA" && (region?.honorGpc ?? true) && readGpc();
}

function splitCategories(categories: Record<string, boolean>): ConsentChangePayload {
  const allowed: ConsentCategory[] = [];
  const denied: ConsentCategory[] = [];
  for (const cat of Object.keys(categories) as ConsentCategory[]) {
    if (categories[cat]) allowed.push(cat);
    else denied.push(cat);
  }
  return { allowedCategories: allowed, deniedCategories: denied };
}

let _runtime: ConsentRuntime | null = null;

export function getOrCreateConsentRuntime(config: CookieYesConfig): ConsentRuntime {
  if (_runtime) return _runtime;

  // `"offline"` is a deprecated alias for `"cookie-only"` — same behavior, one
  // warning per page load. Checked on the raw config before normalization.
  if (config.mode === "offline") _warnOfflineModeDeprecated();

  // Collapse deprecated aliases (`overrides.regulation` → `regulation`,
  // `backendURL` → `apiUrl`) into the one canonical shape both packages share.
  const options = _normalizeConfig(config);
  const changeListeners = new Set<(payload: ConsentChangePayload) => void>();
  const userOnConsentUpdate = options.onConsentUpdate;
  // Assigned right after the manager exists; only ever read from within
  // onConsentUpdate, which can't fire until the visitor acts (post-init).
  let emitter: ConsentEmitter;

  // Resolve which regulation applies (geo-detection if configured, else the
  // manual/default). Drives the banner and is recorded on the consent payload.
  const regionDecision: RegionDecision = options.region
    ? resolveRegion(options.region, options.regulation)
    : {
        region: undefined,
        regulation: options.regulation ?? "DEFAULT",
        source: "manual",
        confidence: "high",
      };

  const cfg: ConsentConfig = {};
  if (options.mode === "self-hosted") {
    if (options.backend) cfg.backend = options.backend;
    else if (options.apiUrl) cfg.apiUrl = options.apiUrl;
  }
  if (options.apiKey) cfg.apiKey = options.apiKey;
  cfg.regulation = regionDecision.regulation;
  if (regionDecision.region) cfg.region = regionDecision.region;
  // Honour the browser's GPC "do not sell" signal on a CCPA banner: start the
  // visitor opted out. GPC never changes the regulation (that's geo only).
  const gpcOptOut = wantsGpcOptOut(regionDecision.regulation, options.region);
  if (gpcOptOut) cfg.gpcOptOut = true;
  if (options.region?.debug) _logRegionDecision(regionDecision, gpcOptOut);
  if (options.colorScheme) cfg.colorScheme = options.colorScheme;
  if (options.theme) cfg.theme = options.theme;
  if (options.reloadOnRevoke) cfg.reloadOnRevoke = options.reloadOnRevoke;
  if (options.integrations) cfg.integrations = options.integrations;
  if (options.customStopHandlers) cfg.customStopHandlers = options.customStopHandlers;
  if (options.categories) cfg.categories = options.categories;
  if (options.onConsentReady) cfg.onConsentReady = options.onConsentReady;

  cfg.onConsentUpdate = (snap) => {
    userOnConsentUpdate?.(snap);
    emitter.push(snap.categories);
    const payload = splitCategories(snap.categories);
    for (const fn of changeListeners) fn(payload);
  };

  const manager = createConsentManager(cfg);
  emitter = createConsentEmitter(() => manager.committedCategories);
  // Same resolution the manager uses internally — exposed so a custom UI can
  // iterate the taxonomy actually in effect (custom list or built-in five).
  const resolved = resolveCategories(options.categories);

  // One listener set drives `consentStore.subscribe`, fed by both consent
  // changes and language switches, so a custom UI re-renders on either.
  const stateListeners = new Set<(state: ConsentStoreState) => void>();
  function notifyState(): void {
    const state = buildState();
    for (const fn of stateListeners) fn(state);
  }
  manager.subscribe(notifyState);
  const language = createLanguageController(options.i18n, notifyState);

  function activeUI(): ActiveUI {
    if (manager.isPreferencesOpen) return "dialog";
    if (!manager.hasActed) return "banner";
    return null;
  }

  function buildState(): ConsentStoreState {
    // `consents`/`categories` are live (drive checkboxes); `committedConsents`
    // and `has()` are the consent in effect (gate scripts/embeds on those).
    const categories = manager.categories;
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories,
      consents: categories,
      committedConsents: manager.committedCategories,
      regulation: manager.regulation,
      lastRenewed: manager.lastRenewed,
      taxonomyHash: manager.taxonomyHash,
      activeUI: activeUI(),
      has: (category) => manager.committedCategories[category] === true,
      saveConsents: async (target) => {
        if (target === "all") manager.acceptAll();
        else if (target === "necessary") manager.rejectAll();
        else manager.acceptSelected(target);
      },
      setConsent: (category, value) => manager.updateCategory(category, value),
      subscribeToConsentChanges: (listener) => {
        changeListeners.add(listener);
        return () => {
          changeListeners.delete(listener);
        };
      },
    };
  }

  const consentStore: ConsentStore = {
    subscribe: (listener) => {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },
    getState: buildState,
    on: (type, listener, opts) => emitter.on(type, listener, opts),
    get translations() {
      return language.getTranslations();
    },
    getLanguageInfo: language.getLanguageInfo,
    setLanguage: language.setLanguage,
    getCategoryText: language.getCategoryText,
    categories: resolved,
    getRegion: () => regionDecision,
  };

  if (options.networkBlocker && options.networkBlocker.rules.length > 0) {
    installNetworkBlocker(
      options.networkBlocker,
      (cat) => manager.committedCategories[cat] === true,
    );
  }

  _runtime = { consentManager: manager, consentStore };
  return _runtime;
}

/**
 * Canonical setup entry point. Alias of {@link getOrCreateConsentRuntime} that
 * accepts the same {@link CookieYesConfig} and returns the same process-wide
 * singleton — provided so documentation can use one setup name (`initCookieYes`)
 * across every package.
 */
export function initCookieYes(config: CookieYesConfig): ConsentRuntime {
  return getOrCreateConsentRuntime(config);
}

export function resetConsentRuntime(): void {
  _runtime = null;
}
