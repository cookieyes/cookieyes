"use client";

import type { Regulation } from "@cookieyes/core";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useRegulation(): Regulation {
  return useRuntimeSelector<Regulation>((snap) => snap.regulation, "DEFAULT");
}
