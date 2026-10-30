"use client";

import { isBannerVisible } from "@cookieyes/ui";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useBannerVisibility(): boolean {
  return useRuntimeSelector(isBannerVisible, false);
}
