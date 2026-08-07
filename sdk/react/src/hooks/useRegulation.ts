"use client";

import type { Regulation } from "@cookieyes/core";
import { useContext } from "react";
import { RegionContext } from "../context/region-context.js";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

export function useRegulation(): Regulation {
  // A `<CookieYesProvider>` (if present) resolves the regulation per request, so
  // the server renders the correct banner. It resolves the same value on the
  // client, so there's no hydration mismatch. Without a provider, read the
  // runtime as before.
  const fromProvider = useContext(RegionContext);
  const fromRuntime = useRuntimeSelector<Regulation>((snap) => snap.regulation, "DEFAULT");
  return fromProvider ? fromProvider.regulation : fromRuntime;
}
