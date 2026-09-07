"use client";

/*
 * Every preset the package ships, mounted at once.
 *
 * Exists to price the two components DEVP-61 Story 3 AC5 asks about — the
 * opt-out dialog and the reload notice — which no other fixture mounts, so
 * their cost would otherwise be invisible. The delta against `with-react`
 * (banner + preferences + recall) is what those two add.
 */

import {
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  createCookieYes,
  RecallButton,
  ReloadNotice,
} from "@cookieyes/react";

createCookieYes().mode("offline").regulation("CCPA").colorScheme("system").mount();

export function CookieYesRoot() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <CookieOptOut />
      <ReloadNotice />
      <RecallButton />
    </>
  );
}
