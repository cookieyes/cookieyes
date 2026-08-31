// matrix/example-app/app/client-consent.tsx
//
// Deliberately exercises the `asChild`/ref path (Slot.tsx — Test B, jsdom,
// runs this same component tree in behaviour.test.tsx) plus an SSR debug
// marker (Test A, ssr.assert.mjs) that echoes back exactly what the server
// decided, so the test can assert the *value* was read correctly — not just
// that the banner was present/absent. See
// ai-context/designs/peer-dependency-matrix.md §5.2, §5.4.
"use client";

import { Banner, CookieBanner, initCookieYes } from "@cookieyes/react";
import { useRef } from "react";

initCookieYes({ mode: "cookie-only", regulation: "GDPR" });

export function ClientConsent({ initialConsent }: { initialConsent: unknown }) {
  const acceptRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <CookieBanner />
      <Banner.AcceptAll asChild ref={acceptRef}>
        <button type="button" data-testid="accept-native">
          Accept (asChild)
        </button>
      </Banner.AcceptAll>
      {/* Debug-only marker; never shipped in the real SDK — consumed by
          tests/ssr.assert.mjs to assert the *exact value* getServerConsent
          read from the request's cookie, not just banner presence/absence. */}
      <script
        id="cy-test-consent"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(initialConsent) }}
      />
    </>
  );
}
