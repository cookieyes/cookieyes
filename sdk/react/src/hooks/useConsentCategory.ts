"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useConsentCategory(category: ConsentCategory): boolean {
  return useRuntimeSelector((snap) => snap.categories[category] === true, false);
}
