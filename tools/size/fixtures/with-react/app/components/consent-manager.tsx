"use client";

/*
 * Mirrors consentbench's `with-cookieyes-react` app: the UI + hooks layer with
 * the three drop-in presets a typical consumer mounts. @cookieyes/nextjs is
 * this same package re-exported with "use client" pre-applied, so the delta
 * measured here is the one the site publishes for the Next.js adapter too.
 */

import { CookieBanner, CookiePreferences, createCookieYes, RecallButton } from "@cookieyes/react";

createCookieYes().mode("offline").regulation("GDPR").colorScheme("system").mount();

export function CookieYesRoot() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <RecallButton />
    </>
  );
}
