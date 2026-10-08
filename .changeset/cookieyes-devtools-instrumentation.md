---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/scripts": patch
---

The SDK now reports what it is doing in development, so the new `@cookieyes/devtools` panel can show it. Production builds are unchanged.

**What is reported.** Consent saves, integration status changes, requests the network blocker stops, Google Consent Mode updates, the region decision, and every script or iframe the SDK manages (`registerScript`, `GatedScript`, `GatedFrame` and the `@cookieyes/scripts` integrations). The reports go onto a global array that the panel reads, the same way a page reads `window.dataLayer`. Every report is guarded by `process.env.NODE_ENV`, so a production build removes it.

**New: force a region in development.** `resolveRegion()` takes an optional third argument, a region code to use instead of detection, and `RegionDecision.source` can now be `"forced"`. Without the argument it behaves exactly as before. `CookieYesProvider` accepts a `forcedRegion` prop, and `@cookieyes/nextjs/server` adds `getServerRegion()`. It returns the region from the request's geo headers, the header that supplied it, the GPC signal and any devtools override, so a server-rendered banner follows a forced region. Production builds ignore overrides.
