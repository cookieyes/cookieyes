---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": patch
"@cookieyes/scripts": patch
---

Dev-only instrumentation hooks for the new `@cookieyes/devtools` package (DEVP-149).

`@cookieyes/core` gains an internal, `@internal`-tagged pub/sub registry (`_devHookRegistry`)
that the network blocker, Google Consent Mode broadcast, integration runner, and consent
manager report to — blocked requests, Consent Mode pushes, integration status changes, and
consent saves. `@cookieyes/react`'s `CookieYesRuntime` exposes the registry as a new internal
`_devtools` field so `@cookieyes/devtools` can subscribe the same way `useConsent` subscribes
to the runtime. None of this is a public API: it exists so the devtools panel can show live
state without scraping `window` or patching anything a second time.

`resolveRegion()` (`@cookieyes/core`) gains an optional third parameter, a forced region code
used in place of geo-detection — the mechanism behind the devtools panel's region override
(`RegionDecision.source` gains `"forced"`). Omitting the parameter is byte-for-byte identical
to the previous behavior. `@cookieyes/nextjs` gains `getServerRegion()` (alongside
`getServerConsent`) so a server-rendered banner can reflect an active override on its next
request, and report which geo header actually drove an unforced decision.

Every new code path is dev-only, guarded by the SDK's existing `process.env.NODE_ENV ===
"production"` literal-guard pattern (see `@cookieyes/core`'s `deprecations.ts`) so it is dead
code in a production bundle — verified by `tools/size`'s size gate, which now includes a
`with-nextjs-devtools` fixture asserting both a byte ceiling and the absence of the devtools
panel's own code from any production chunk.
