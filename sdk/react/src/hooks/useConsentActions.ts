"use client";

import type { ConsentCategory, ConsentSource } from "@cookieyes/core";
import { useMemo } from "react";
import { rememberFocusBeforeDialog } from "../primitives/utils.js";
import { _tryGetCookieYes } from "../runtime.js";

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

const NOOP_ACTIONS: ConsentActions = {
  acceptAll: () => undefined,
  rejectAll: () => undefined,
  acceptSelected: () => undefined,
  save: () => undefined,
  updateCategory: () => undefined,
  reset: () => undefined,
  showPreferences: () => undefined,
  hidePreferences: () => undefined,
  showOptOut: () => undefined,
  hideOptOut: () => undefined,
  dismissBanner: () => undefined,
};

/**
 * Imperative actions for driving consent (accept/reject/save/reset, open or
 * close the preferences dialog, dismiss the banner). Pair this with `useConsent()` for
 * reading state — this hook only writes, it does not subscribe to changes.
 *
 * `source` says where your UI is (`"banner"`, `"preferences"`, `"optout"`), so the
 * consent record shows where each decision was made. Omit it and decisions are
 * recorded as `"api"`.
 */
export function useConsentActions(source?: ConsentSource): ConsentActions {
  const runtime = _tryGetCookieYes();
  return useMemo<ConsentActions>(() => {
    if (!runtime) return NOOP_ACTIONS;
    return {
      acceptAll: () => runtime.manager.acceptAll(source),
      rejectAll: () => runtime.manager.rejectAll(source),
      acceptSelected: (categories) => runtime.manager.acceptSelected(categories, source),
      save: () => runtime.manager.savePreferences(source),
      updateCategory: (category, value) => runtime.manager.updateCategory(category, value),
      reset: () => runtime.manager.resetConsent(),
      showPreferences: () => {
        rememberFocusBeforeDialog();
        runtime.manager.showPreferences();
      },
      hidePreferences: () => runtime.manager.hidePreferences(),
      showOptOut: () => {
        rememberFocusBeforeDialog();
        runtime.showOptOut();
      },
      hideOptOut: () => runtime.hideOptOut(),
      dismissBanner: () => runtime.manager.dismissBanner(),
    };
  }, [runtime, source]);
}
