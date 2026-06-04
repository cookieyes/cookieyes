"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { useMemo } from "react";
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
};

export function useConsentActions(): ConsentActions {
  const runtime = _tryGetCookieYes();
  return useMemo<ConsentActions>(() => {
    if (!runtime) return NOOP_ACTIONS;
    return {
      acceptAll: () => runtime.manager.acceptAll(),
      rejectAll: () => runtime.manager.rejectAll(),
      acceptSelected: (categories) => runtime.manager.acceptSelected(categories),
      save: () => runtime.manager.savePreferences(),
      updateCategory: (category, value) => runtime.manager.updateCategory(category, value),
      reset: () => runtime.manager.resetConsent(),
      showPreferences: () => runtime.manager.showPreferences(),
      hidePreferences: () => runtime.manager.hidePreferences(),
      showOptOut: () => runtime.showOptOut(),
      hideOptOut: () => runtime.hideOptOut(),
    };
  }, [runtime]);
}
