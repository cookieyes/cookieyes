"use client";

import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useBannerVisibility(): boolean {
  return useRuntimeSelector(
    (snap) => !snap.hasActed && !snap.isPreferencesOpen && !snap.isOptOutOpen,
    false,
  );
}
