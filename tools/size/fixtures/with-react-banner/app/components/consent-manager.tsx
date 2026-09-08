"use client";

/*
 * The banner and nothing else.
 *
 * This fixture exists because the landing page's headline figure is quoted as
 * "the whole banner, gzipped" — a narrower claim than the `with-react` fixture
 * measures, which also mounts the preferences dialog and the recall button. Two
 * different things were being described by one number. Measuring both means the
 * published claim can be stated on the basis it actually names.
 *
 * It is also the floor for the preferences-dialog code split: if that lands,
 * `with-react`'s initial download should approach this figure.
 */

import { CookieBanner, createCookieYes } from "@cookieyes/react";

createCookieYes().mode("offline").regulation("GDPR").colorScheme("system").mount();

export function CookieYesRoot() {
  return <CookieBanner />;
}
