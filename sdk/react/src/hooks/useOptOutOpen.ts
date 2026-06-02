"use client";

import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useOptOutOpen(): boolean {
  return useRuntimeSelector((snap) => snap.isOptOutOpen, false);
}
