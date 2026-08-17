"use client";

import { useContext, useMemo } from "react";
import { SsrConsentContext } from "../context/ssr-consent-context.js";
import { _SSR_SNAPSHOT, type CookieYesRuntime, type CookieYesSnapshot } from "../runtime.js";

/**
 * The snapshot used for the server render **and** the first hydration render.
 *
 * Without an `initialConsent` this is just the runtime's regulation-aware server
 * snapshot, which always describes a fresh visitor — so the server sends banner
 * markup to everyone and a returning visitor sees it disappear after hydration.
 * With one, the stored decision is folded in, `hasActed` is true, and the banner
 * is never rendered at all: nothing to hide, so nothing flashes.
 *
 * Only the consent fields are taken from the stored decision. `regulation` stays
 * whatever the runtime/provider resolved for this request, because that is the
 * authority on which banner variant applies — a stored snapshot's regulation is
 * incidental.
 *
 * The result is memoised because `useSyncExternalStore` requires a stable
 * identity from `getServerSnapshot`; returning a fresh object each call would
 * make React loop.
 */
export function useServerSnapshot(runtime: CookieYesRuntime | null): CookieYesSnapshot {
  const initialConsent = useContext(SsrConsentContext);
  return useMemo(() => {
    const base = runtime ? runtime.getServerSnapshot() : _SSR_SNAPSHOT;
    if (initialConsent == null) return base;
    return {
      ...base,
      consentId: initialConsent.consentId,
      hasActed: initialConsent.hasActed,
      categories: { ...initialConsent.categories },
      // A stored decision is by definition committed, so gated scripts and
      // embeds are unblocked on the very first render too.
      committedCategories: { ...initialConsent.categories },
      lastRenewed: initialConsent.lastRenewed,
      taxonomyHash: initialConsent.taxonomyHash,
    };
  }, [runtime, initialConsent]);
}
