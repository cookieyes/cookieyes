"use client";

import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useBannerVisibility(): boolean {
  return useRuntimeSelector(
    (snap) =>
      !snap.hasActed && !snap.isBannerDismissed && !snap.isPreferencesOpen && !snap.isOptOutOpen,
    false,
  );
}
