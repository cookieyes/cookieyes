"use client";

import {
  type ConsentSnapshot,
  type RegionConfig,
  type RegionDecision,
  type Regulation,
  resolveRegion,
} from "@cookieyes/core";
import { type ReactNode, useEffect, useMemo, useSyncExternalStore } from "react";
import { RegionContext } from "./region-context.js";
import { SsrConsentContext } from "./ssr-consent-context.js";

/**
 * Declared locally rather than pulled in from `@types/node` — see the
 * identical note in core's `deprecations.ts`.
 */
declare const process: { env: { NODE_ENV?: string } };

/** The global queue core pushes to; see the note in core's `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

/**
 * Dev-only `forceRegion` reader (`@cookieyes/devtools`, AD-4) — client-side.
 * Deliberately NOT exported from `@cookieyes/core`, and duplicated locally
 * here rather than imported from `runtime.ts`: a plain, unexported,
 * single-call-site function is eliminated by the same dead-code pass that
 * removes its only caller once the guard around that caller folds away — a
 * shared cross-file (even same-package) reference risks surviving instead.
 */
function readForcedRegion(): string | undefined {
  if (typeof document !== "undefined") {
    const match = /(?:^|;\s*)__cyd_region=([^;]*)/.exec(document.cookie);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        // A malformed cookie value is ignored rather than breaking render.
        return undefined;
      }
    }
  }
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem("__cyd_region") ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

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
  /**
   * A returning visitor's stored consent, read from the request on the server
   * with `readServerConsent()` (or `getServerConsent()` in `@cookieyes/nextjs`).
   * Pass it and the banner is never rendered for them — not rendered and then
   * removed after hydration, which looks like a flicker. `null`/omitted means
   * "no decision on record", so the banner renders as usual.
   *
   * This is a prop rather than an `initCookieYes` option on purpose: the runtime
   * is a module-level singleton shared across concurrent server requests, so
   * per-visitor consent stored there would leak between visitors.
   */
  initialConsent?: ConsentSnapshot | null;
  /**
   * Dev-only: a `forceRegion` override already resolved on the server, from
   * the incoming request's `__cyd_region` cookie — e.g.
   * `@cookieyes/nextjs/server`'s `getServerRegion()`'s `forcedRegion` field.
   * Pass it so the server-rendered banner matches an active override with no
   * reload/flash (`CookieYesProvider` itself has no server-side cookie
   * access — it is framework-agnostic). Ignored client-side when
   * `readForcedRegion()` already found a value (the common case — a
   * client-side reload picks up a fresh override on its own); ignored
   * entirely in production, same as every other `forceRegion` entry point.
   */
  forcedRegion?: string | undefined;
  children: ReactNode;
};

const noSubscribe = () => () => {};

/**
 * Dev-only: the active `forceRegion` override. `forcedRegionProp` is what a
 * server helper (e.g. `getServerRegion()`) read from the request's cookie;
 * without it, the browser's own cookie/localStorage is read.
 *
 * Through `useSyncExternalStore` so hydration matches the server: the server
 * snapshot (and the hydrating render) use only the prop, then React re-renders
 * with the browser's value. Reading the cookie during the first client render
 * instead would render a different banner than the server did. Passing the
 * prop avoids even the post-hydration switch.
 *
 * Only ever called behind the literal production guard in `CookieYesProvider`,
 * so it is removed from production bundles along with its caller.
 */
function useDevForcedRegion(forcedRegionProp: string | undefined): string | undefined {
  return useSyncExternalStore(
    noSubscribe,
    () => forcedRegionProp ?? readForcedRegion(),
    () => forcedRegionProp,
  );
}

function decide(
  region: RegionConfig | undefined,
  regulation: Regulation | undefined,
  forcedRegion: string | undefined,
): RegionDecision {
  if (region) return resolveRegion(region, regulation, forcedRegion);
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
export function CookieYesProvider(props: CookieYesProviderProps) {
  const { region, regulation, initialConsent = null, children } = props;
  // `forcedRegion` is read from `props` only inside this literal guard — kept
  // out of the destructured parameter list above on purpose, so a consumer's
  // bundler can fold this whole line (and therefore the property read itself)
  // away in production, not merely its result. See `decide()`'s own note.
  // The hook call sits behind a build-time constant, so the order of hooks is the
  // same on every render of a given build.
  const forcedRegion =
    process.env.NODE_ENV !== "production"
      ? // biome-ignore lint/correctness/useHookAtTopLevel: guarded by a build-time constant, stable per build.
        useDevForcedRegion(props.forcedRegion)
      : undefined;
  // Resolved from the inputs and memoised on them, so the context value keeps a
  // stable identity across re-renders (consumers don't re-render needlessly).
  const value = useMemo(
    () => decide(region, regulation, forcedRegion),
    [region, regulation, forcedRegion],
  );
  // Dev-only devtools instrumentation: the regulation this provider resolved
  // per request is what the banner shows, and it can differ from the runtime's
  // own (startup) value, which is all a panel mounted outside the provider can
  // read. Folds away in production; see core's `network-blocker.ts`.
  if (process.env.NODE_ENV !== "production") {
    // biome-ignore lint/correctness/useHookAtTopLevel: guarded by a build-time constant, stable per build.
    useEffect(() => {
      const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
        v: 1,
      }));
      if (q.length >= 500) q.shift();
      q.push({ k: "p", t: Date.now(), d: value });
    }, [value]);
  }
  return (
    <RegionContext.Provider value={value}>
      <SsrConsentContext.Provider value={initialConsent}>{children}</SsrConsentContext.Provider>
    </RegionContext.Provider>
  );
}
