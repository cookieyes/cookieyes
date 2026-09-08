"use client";

/*
 * Mirrors consentbench's `fair-cookieyes` app — the Next.js adapter, which is
 * the variant the leaderboard's headline CookieYes row actually measures.
 *
 * It has its own fixture rather than being assumed equal to `with-react`
 * because `@cookieyes/nextjs` is not merely a re-export: it declares
 * `@cookieyes/scripts` as a hard runtime dependency and imports
 * `googleConsentModeSnippet` from it. Whether that reaches the client bundle is
 * a question only measurement answers, and the published figures quote the same
 * 11.9 KB for this app and for `with-react` — which cannot both have been
 * measured.
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
