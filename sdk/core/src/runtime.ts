import { createConsentManager } from "./manager.js";
import { installNetworkBlocker } from "./network-blocker.js";
import type {
  ActiveUI,
  ConsentCategory,
  ConsentChangePayload,
  ConsentConfig,
  ConsentRuntime,
  ConsentRuntimeOptions,
  ConsentStore,
  ConsentStoreState,
} from "./types.js";

function splitCategories(categories: Record<ConsentCategory, boolean>): ConsentChangePayload {
  const allowed: ConsentCategory[] = [];
  const denied: ConsentCategory[] = [];
  for (const cat of Object.keys(categories) as ConsentCategory[]) {
    if (categories[cat]) allowed.push(cat);
    else denied.push(cat);
  }
  return { allowedCategories: allowed, deniedCategories: denied };
}

let _runtime: ConsentRuntime | null = null;

export function getOrCreateConsentRuntime(options: ConsentRuntimeOptions): ConsentRuntime {
  if (_runtime) return _runtime;

  const changeListeners = new Set<(payload: ConsentChangePayload) => void>();
  const userOnConsentUpdate = options.onConsentUpdate;

  const cfg: ConsentConfig = {};
  if (options.mode === "self-hosted") {
    if (options.backend) cfg.backend = options.backend;
    else if (options.backendURL) cfg.apiUrl = options.backendURL;
  }
  if (options.apiKey) cfg.apiKey = options.apiKey;
  if (options.overrides?.regulation) cfg.regulation = options.overrides.regulation;
  if (options.colorScheme) cfg.colorScheme = options.colorScheme;
  if (options.theme) cfg.theme = options.theme;
  if (options.reloadOnRevoke) cfg.reloadOnRevoke = options.reloadOnRevoke;
  if (options.onConsentReady) cfg.onConsentReady = options.onConsentReady;

  cfg.onConsentUpdate = (snap) => {
    userOnConsentUpdate?.(snap);
    const payload = splitCategories(snap.categories);
    for (const fn of changeListeners) fn(payload);
  };

  const manager = createConsentManager(cfg);

  function activeUI(): ActiveUI {
    if (manager.isPreferencesOpen) return "dialog";
    if (!manager.hasActed) return "banner";
    return null;
  }

  function buildState(): ConsentStoreState {
    const categories = manager.categories;
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories,
      consents: categories,
      regulation: manager.regulation,
      lastRenewed: manager.lastRenewed,
      activeUI: activeUI(),
      has: (category) => manager.categories[category] ?? false,
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
    subscribe: (listener) => manager.subscribe(() => listener(buildState())),
    getState: buildState,
  };

  if (options.networkBlocker && options.networkBlocker.rules.length > 0) {
    installNetworkBlocker(options.networkBlocker, (cat) => manager.categories[cat] === true);
  }

  _runtime = { consentManager: manager, consentStore };
  return _runtime;
}

export function resetConsentRuntime(): void {
  _runtime = null;
}
