"use client";

/*
 * Byte-identical to with-nextjs's own consent-manager.tsx — see that fixture's
 * header for why @cookieyes/nextjs (not @cookieyes/react) is measured here.
 * This fixture exists to prove the OPPOSITE claim: that adding
 * <CookieYesDevtools/> from @cookieyes/devtools on top of this exact app
 * changes nothing in a production build (AD-5 / A2). See devtools-root.tsx
 * for the added mount.
 */

import { CookieBanner, CookiePreferences, createCookieYes } from "@cookieyes/nextjs";

createCookieYes().mode("offline").regulation("GDPR").colorScheme("system").mount();

export function CookieYesRoot() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
    </>
  );
}
