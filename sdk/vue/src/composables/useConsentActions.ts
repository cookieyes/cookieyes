import type { ConsentCategory, ConsentSource } from "@cookieyes/core";
import { rememberOpener } from "@cookieyes/ui";
import { _useRuntime } from "./useRuntime.js";

export type ConsentActions = {
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (categories: ConsentCategory[]) => void;
  save: () => void;
  updateCategory: (category: ConsentCategory, value: boolean) => void;
  reset: () => void;
  showPreferences: () => void;
  hidePreferences: () => void;
  showOptOut: () => void;
  hideOptOut: () => void;
  /** Close the banner without a decision; nothing is saved. */
  dismissBanner: () => void;
};

/**
 * Imperative actions for driving consent. This only writes; it does not track changes, so pair
 * it with `useConsent()` to read. `source` says where your UI is (`"banner"`, `"preferences"`,
 * `"optout"`) so the consent record shows where each decision was made. Omit it and decisions
 * are recorded as `"api"`.
 */
export function useConsentActions(source?: ConsentSource): ConsentActions {
  const runtime = _useRuntime("useConsentActions");
  return {
    acceptAll: () => runtime.manager.acceptAll(source),
    rejectAll: () => runtime.manager.rejectAll(source),
    acceptSelected: (categories) => runtime.manager.acceptSelected(categories, source),
    save: () => runtime.manager.savePreferences(source),
    updateCategory: (category, value) => runtime.manager.updateCategory(category, value),
    reset: () => runtime.manager.resetConsent(),
    showPreferences: () => {
      rememberOpener();
      runtime.manager.showPreferences();
    },
    hidePreferences: () => runtime.manager.hidePreferences(),
    showOptOut: () => {
      rememberOpener();
      runtime.showOptOut();
    },
    hideOptOut: () => runtime.hideOptOut(),
    dismissBanner: () => runtime.manager.dismissBanner(),
  };
}
