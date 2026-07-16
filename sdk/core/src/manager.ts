import {
  clearConsentCookie,
  defaultSnapshot,
  generateConsentId,
  rawFieldsToSnapshot,
  readConsentCookie,
  writeConsentCookie,
} from "./cookie.js";
import { applyScripts, registerScript } from "./scripts.js";
import {
  applyStopHandlers,
  initStopHandlers,
  registerStopHandler,
  resolveBuiltInIntegration,
} from "./stop-handlers.js";
import { buildConsentPayload, pushConsent } from "./sync.js";
import type {
  ConsentCategory,
  ConsentConfig,
  ConsentManager,
  ConsentSnapshot,
  ReloadNoticeState,
  ScriptEntry,
} from "./types.js";

const ALL_CATEGORIES: ConsentCategory[] = [
  "necessary",
  "functional",
  "analytics",
  "performance",
  "advertisement",
];

export function createConsentManager(config: ConsentConfig): ConsentManager {
  const listeners = new Set<(state: ConsentSnapshot) => void>();

  let state: ConsentSnapshot;
  let isPreferencesOpen = false;
  let lastPersistedCategories: Record<ConsentCategory, boolean>;

  // Reload-notice state: `reasons` is the set of handler ids that currently
  // can't be stopped cleanly; `dismissed` suppresses the notice until a
  // genuinely different set of reasons appears (so it doesn't keep popping up).
  let reloadReasons: string[] = [];
  let reloadDismissed = false;

  // Register stop-handlers: built-in integrations + the customer's own.
  for (const integration of config.integrations ?? []) {
    registerStopHandler(resolveBuiltInIntegration(integration));
  }
  for (const handler of config.customStopHandlers ?? []) {
    registerStopHandler(handler);
  }

  // --- Synchronous initialisation from cookie ---
  const rawFields = readConsentCookie();
  const savedRegulation = config.regulation ?? "DEFAULT";

  if (rawFields) {
    state = rawFieldsToSnapshot(rawFields, savedRegulation);
  } else {
    const consentId = generateConsentId();
    state = defaultSnapshot(consentId, savedRegulation);

    // CCPA is an opt-out model: consent is implicit from page load.
    // Write the cookie immediately so all-category values (yes) are available
    // to third-party scripts before the user has explicitly acted.
    if (state.regulation === "CCPA") {
      writeConsentCookie(state);
    }
  }
  lastPersistedCategories = { ...state.categories };

  // Fire onConsentReady synchronously on next tick.
  Promise.resolve().then(() => config.onConsentReady?.(state));

  function notify(): void {
    const snap = snapshot();
    for (const fn of listeners) fn(snap);
    applyScripts(state.categories);
  }

  function snapshot(): ConsentSnapshot {
    return {
      consentId: state.consentId,
      hasActed: state.hasActed,
      categories: { ...state.categories },
      regulation: state.regulation,
      lastRenewed: state.lastRenewed,
    };
  }

  function setReloadReasons(reasons: string[]): void {
    const changed =
      reasons.length !== reloadReasons.length || reasons.some((r, i) => r !== reloadReasons[i]);
    if (changed) {
      reloadReasons = reasons;
      // A genuinely new set of blocked tools → allow the notice to show again.
      reloadDismissed = false;
    }
  }

  function persist(): void {
    state = {
      ...state,
      hasActed: true,
      lastRenewed: Date.now(),
    };
    writeConsentCookie(state);
    if (config.backend) {
      // Best-effort: swallow both sync throws and async rejections so a
      // broken/missing backend never breaks the consent UX.
      try {
        Promise.resolve(config.backend.persist(buildConsentPayload(state))).catch(() => undefined);
      } catch {
        // sync throw from .persist itself
      }
    } else if (config.apiUrl) {
      void pushConsent(config.apiUrl, config.apiKey, state);
    }

    // Detect "revoke" — any category that was previously consented but now isn't.
    let didRevoke = false;
    for (const cat of ALL_CATEGORIES) {
      if (lastPersistedCategories[cat] && !state.categories[cat]) {
        didRevoke = true;
        break;
      }
    }
    lastPersistedCategories = { ...state.categories };

    // Stop (or resume) integrations to match the new consent state — without a
    // reload. Anything with no clean runtime stop comes back in reloadRequiredBy
    // and surfaces the reload notice instead of silently continuing to track.
    const { reloadRequiredBy } = applyStopHandlers(state.categories);
    setReloadReasons(reloadRequiredBy);

    notify();
    config.onConsentUpdate?.(state);

    // Legacy opt-in hard reload (off by default). The stop-handlers above are
    // the safe path; this remains only for customers who explicitly want it.
    // pushConsent uses keepalive: true so it survives the navigation.
    if (didRevoke && config.reloadOnRevoke && typeof window !== "undefined") {
      window.location.reload();
    }
  }

  const manager: ConsentManager = {
    get consentId() {
      return state.consentId;
    },
    get hasActed() {
      return state.hasActed;
    },
    get categories() {
      return { ...state.categories };
    },
    get regulation() {
      return state.regulation;
    },
    get lastRenewed() {
      return state.lastRenewed;
    },
    get isPreferencesOpen() {
      return isPreferencesOpen;
    },

    acceptAll() {
      state = {
        ...state,
        categories: {
          necessary: true,
          functional: true,
          analytics: true,
          performance: true,
          advertisement: true,
        },
      };
      isPreferencesOpen = false;
      persist();
    },

    rejectAll() {
      state = {
        ...state,
        categories: {
          necessary: true,
          functional: false,
          analytics: false,
          performance: false,
          advertisement: false,
        },
      };
      isPreferencesOpen = false;
      persist();
    },

    acceptSelected(categories: ConsentCategory[]) {
      const cats = { ...state.categories };
      for (const cat of ALL_CATEGORIES) {
        if (cat === "necessary") continue;
        cats[cat] = categories.includes(cat);
      }
      state = { ...state, categories: cats };
      isPreferencesOpen = false;
      persist();
    },

    updateCategory(category: ConsentCategory, value: boolean) {
      if (category === "necessary") return;
      state = {
        ...state,
        categories: { ...state.categories, [category]: value },
      };
      notify();
    },

    savePreferences() {
      isPreferencesOpen = false;
      persist();
    },

    resetConsent() {
      clearConsentCookie();
      const consentId = generateConsentId();
      state = defaultSnapshot(consentId, state.regulation);
      isPreferencesOpen = false;
      // Realign clean-stop flags with the reset state; clear any reload notice
      // (a reset re-prompts, so a stale "reload to apply" message is wrong).
      applyStopHandlers(state.categories);
      reloadReasons = [];
      reloadDismissed = false;
      notify();
    },

    showPreferences() {
      isPreferencesOpen = true;
      notify();
    },

    hidePreferences() {
      isPreferencesOpen = false;
      notify();
    },

    subscribe(listener: (state: ConsentSnapshot) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    registerScript(entry: ScriptEntry) {
      registerScript(entry);
      applyScripts(state.categories);
    },

    get reloadNotice(): ReloadNoticeState {
      return {
        required: reloadReasons.length > 0 && !reloadDismissed,
        reasons: [...reloadReasons],
      };
    },

    dismissReloadNotice() {
      if (reloadDismissed) return;
      reloadDismissed = true;
      notify();
    },
  };

  // Apply scripts for any that were already registered before manager created
  applyScripts(state.categories);

  // Reflect the full stored consent at load — in both directions — so tools
  // start in the right mode from first paint. In particular a returning
  // visitor who previously *granted* a category gets a resume (e.g. Consent
  // Mode `update: granted`), instead of being stuck in the page's
  // deny-by-default state. No reload notice at load (that's only for live
  // revokes). Live changes after this go through applyStopHandlers.
  initStopHandlers(state.categories);

  return manager;
}
