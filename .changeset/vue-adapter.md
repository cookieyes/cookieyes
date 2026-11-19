---
"@cookieyes/vue": minor
---

Vue 3 apps can now add the CookieYes consent banner with `@cookieyes/vue`, with the same banner, dialogs and recall button as the React adapter.

**New: `@cookieyes/vue`.** Start the SDK with `app.use(CookieYes, config)`, which takes the same configuration as `initCookieYes` in `@cookieyes/core` and `@cookieyes/react`. Render `CookieBanner`, `CookiePreferences` and `RecallButton`, or build your own from the `Banner`, `Preferences` and `OptOut` primitives. Composables such as `useConsent` and `useConsentCategory` return refs. Import `@cookieyes/vue/styles.css`; without it the banner renders unstyled. Requires Vue 3.5 or later.
