"use client";

import {
  type RegionConfig,
  type RegionDecision,
  type Regulation,
  resolveRegion,
} from "@cookieyes/core";
import { type ReactNode, useMemo } from "react";
import { RegionContext } from "./region-context.js";

export type CookieYesProviderProps = {
  /**
   * The same `region` config you pass to `initCookieYes`. Resolved on every
   * render — so on the server it uses the request's region and the banner is
   * server-rendered with the correct regulation, per visitor. GPC is not
   * applied here (it never changes the banner); it opts a CCPA visitor out on
   * the client instead.
   */
  region?: RegionConfig;
  /**
   * A fixed regulation, when you aren't detecting by region. If both `region`
   * and `regulation` are given, the manual `regulation` wins (matching
   * `initCookieYes`).
   */
  regulation?: Regulation;
  children: ReactNode;
};

function decide(
  region: RegionConfig | undefined,
  regulation: Regulation | undefined,
): RegionDecision {
  if (region) return resolveRegion(region, regulation);
  return {
    region: undefined,
    regulation: regulation ?? "DEFAULT",
    source: "manual",
    confidence: "high",
  };
}

/**
 * Supplies the resolved regulation to `<CookieBanner>`, `useRegulation()` and
 * `useRegion()` through React context — so, in a Server Component tree (Next.js
 * App Router), the correct banner is rendered on the server for each request,
 * not corrected after hydration. Wrap your consent UI with it and pass the same
 * `region` config you give `initCookieYes`. Without it, the hooks read the
 * runtime as before — the provider is optional and additive.
 */
export function CookieYesProvider({ region, regulation, children }: CookieYesProviderProps) {
  // Resolved from the inputs and memoised on them, so the context value keeps a
  // stable identity across re-renders (consumers don't re-render needlessly).
  const value = useMemo(() => decide(region, regulation), [region, regulation]);
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}
