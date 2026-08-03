import { resolveCategories } from "./categories.js";
import {
  clearConsentCookie,
  defaultSnapshot,
  generateConsentId,
  rawFieldsToSnapshot,
  readConsentCookie,
  writeConsentCookie,
} from "./cookie.js";
import { broadcastGoogleConsent } from "./google-consent-mode.js";
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

export function createConsentManager(config: ConsentConfig): ConsentManager {
  const listeners = new Set<(state: ConsentSnapshot) => void>();

  // Resolve the category taxonomy (built-in five, or the customer's, or a
  // validated fallback to the five). Everything below is driven by this.
  const resolved = resolveCategories(config.categories);

  let state: ConsentSnapshot;
  let isPreferencesOpen = false;
  let lastPersistedCategories: Record<string, boolean>;
  // Consent actually in effect — changes only on a real decision (accept /
  // reject / save / reset / load), never on a dialog toggle. Gating reads this;
  // `state.categories` stays live to drive the dialog checkboxes.
  let committedCategories: Record<string, boolean>;

  /** Build a category map over the resolved ids; required ids are always granted. */
  function buildCategories(
    grantNonRequired: (id: ConsentCategory) => boolean,
  ): Record<string, boolean> {
    const cats: Record<string, boolean> = {};
    for (const id of resolved.ids) {
      cats[id] = resolved.requiredIds.has(id) ? true : grantNonRequired(id);
    }
    return cats;
  }

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

  // Decide whether stored consent is still valid for the current taxonomy:
  // - tax stamp matches            → reuse it.
  // - legacy cookie (no stamp) on the default taxonomy → reuse it (upgrade-safe:
  //   never resets existing users who were on the built-in five).
  // - otherwise (taxonomy changed) → re-request from scratch.
  const storedTax = rawFields?.tax;
  const taxMatches = storedTax === resolved.taxonomyHash;
  const legacyCookie = storedTax === undefined;
  const storedConsentValid =
    rawFields != null && (taxMatches || (legacyCookie && resolved.isDefault));

  if (rawFields != null && storedConsentValid) {
    state = rawFieldsToSnapshot(rawFields, savedRegulation, resolved);
  } else {
    const consentId = rawFields?.consentid ?? generateConsentId();
    state = defaultSnapshot(consentId, savedRegulation, resolved);
    // Taxonomy changed under an existing visitor → drop the stale cookie so we
    // genuinely re-request rather than leaving a mismatched record behind.
    if (rawFields != null) clearConsentCookie();

    // CCPA is an opt-out model: consent is implicit from page load.
    // Write the cookie immediately so all-category values (yes) are available
    // to third-party scripts before the user has explicitly acted.
    if (state.regulation === "CCPA") {
      writeConsentCookie(state);
    }
  }
  // The state's taxonomy is always the resolved one — stamp it so cookies
  // written from here on carry the current signature (upgrades legacy cookies).
  state = { ...state, taxonomyHash: resolved.taxonomyHash };

  // GPC "do not sell": until the visitor explicitly acts, an incoming CCPA
  // opt-out signal starts them opted out — non-required categories off — so no
  // gated script or embed runs before they choose. An explicit choice
  // (hasActed) always wins over the signal. `gpcOptOut` is only set for CCPA,
  // where the cookie is written at load, so re-write it to carry the opt-out.
  if (config.gpcOptOut && !state.hasActed) {
    state = { ...state, categories: buildCategories(() => false) };
    writeConsentCookie(state);
  }
  lastPersistedCategories = { ...state.categories };
  committedCategories = { ...state.categories };

  // Fire onConsentReady synchronously on next tick.
  Promise.resolve().then(() => config.onConsentReady?.(state));

  function notify(): void {
    const snap = snapshot();
    for (const fn of listeners) fn(snap);
    // Scripts are applied from committed consent (below), not here — so a dialog
    // toggle, which calls notify, never loads a gated script before save.
  }

  /** Apply script gating against the committed consent, not the working toggles. */
  function applyCommittedScripts(): void {
    applyScripts(committedCategories);
  }

  function snapshot(): ConsentSnapshot {
    return {
      consentId: state.consentId,
      hasActed: state.hasActed,
      categories: { ...state.categories },
      regulation: state.regulation,
      lastRenewed: state.lastRenewed,
      taxonomyHash: state.taxonomyHash,
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
        Promise.resolve(config.backend.persist(buildConsentPayload(state, config.region))).catch(
          () => undefined,
        );
      } catch {
        // sync throw from .persist itself
      }
    } else if (config.apiUrl) {
      void pushConsent(config.apiUrl, config.apiKey, state, config.region);
    }

    // Detect "revoke" — any category that was previously consented but now isn't.
    let didRevoke = false;
    for (const id of resolved.ids) {
      if (lastPersistedCategories[id] && !state.categories[id]) {
        didRevoke = true;
        break;
      }
    }
    lastPersistedCategories = { ...state.categories };
    // This is a real decision → commit it, and (re)apply script gating from it.
    committedCategories = { ...state.categories };
    applyCommittedScripts();

    // Stop (or resume) integrations to match the new consent state — without a
    // reload. Anything with no clean runtime stop comes back in reloadRequiredBy
    // and surfaces the reload notice instead of silently continuing to track.
    const { reloadRequiredBy } = applyStopHandlers(committedCategories);
    setReloadReasons(reloadRequiredBy);

    // Broadcast Google Consent Mode signals for the new state (no-op unless a
    // dataLayer is present). Derived from the category → GCM-signal mapping.
    broadcastGoogleConsent(resolved, committedCategories);

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
    get committedCategories() {
      return { ...committedCategories };
    },
    get regulation() {
      return state.regulation;
    },
    get lastRenewed() {
      return state.lastRenewed;
    },
    get taxonomyHash() {
      return state.taxonomyHash;
    },
    get isPreferencesOpen() {
      return isPreferencesOpen;
    },

    acceptAll() {
      state = { ...state, categories: buildCategories(() => true) };
      isPreferencesOpen = false;
      persist();
    },

    rejectAll() {
      state = { ...state, categories: buildCategories(() => false) };
      isPreferencesOpen = false;
      persist();
    },

    acceptSelected(categories: ConsentCategory[]) {
      state = { ...state, categories: buildCategories((id) => categories.includes(id)) };
      isPreferencesOpen = false;
      persist();
    },

    updateCategory(category: ConsentCategory, value: boolean) {
      // Required categories are always on and can't be toggled off.
      if (resolved.requiredIds.has(category)) return;
      // Ignore ids that aren't part of the configured taxonomy.
      if (!resolved.ids.includes(category)) return;
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
      state = defaultSnapshot(consentId, state.regulation, resolved);
      committedCategories = { ...state.categories };
      lastPersistedCategories = { ...state.categories };
      isPreferencesOpen = false;
      // Realign clean-stop flags with the reset state; clear any reload notice
      // (a reset re-prompts, so a stale "reload to apply" message is wrong).
      applyStopHandlers(committedCategories);
      broadcastGoogleConsent(resolved, committedCategories);
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
      applyCommittedScripts();
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
  applyCommittedScripts();

  // Reflect the full stored consent at load — in both directions — so tools
  // start in the right mode from first paint. In particular a returning
  // visitor who previously *granted* a category gets a resume (e.g. Consent
  // Mode `update: granted`), instead of being stuck in the page's
  // deny-by-default state. No reload notice at load (that's only for live
  // revokes). Live changes after this go through applyStopHandlers.
  initStopHandlers(state.categories);

  // Broadcast the initial Consent Mode state on load (no-op unless a Google
  // dataLayer is present), so Google tags see the returning visitor's choice
  // — or the deny-by-default for a first-time visitor — from first paint.
  broadcastGoogleConsent(resolved, state.categories);

  return manager;
}
