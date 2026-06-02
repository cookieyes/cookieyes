"use client";

import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function usePreferencesOpen(): boolean {
  return useRuntimeSelector((snap) => snap.isPreferencesOpen, false);
}
