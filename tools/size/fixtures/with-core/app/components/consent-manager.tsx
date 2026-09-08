"use client";

/*
 * Mirrors consentbench's `with-cookieyes-core` app byte-for-byte in intent:
 * @cookieyes/core is the headless engine, so this initialises the offline
 * runtime and subscribes — no banner is rendered. This measures the pure
 * engine cost. Do not add UI here; that is what `with-react` is for.
 */

import { getOrCreateConsentRuntime } from "@cookieyes/core";
import { useEffect } from "react";

export function CookieYesRoot() {
  useEffect(() => {
    const { consentStore } = getOrCreateConsentRuntime({
      mode: "offline",
      overrides: { regulation: "GDPR" },
      colorScheme: "system",
    });
    const unsubscribe = consentStore.subscribe((state) => {
      if (state.has("analytics")) {
        // load analytics scripts here
      }
    });
    return () => unsubscribe();
  }, []);

  return null;
}
