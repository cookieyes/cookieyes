---
"@cookieyes/svelte": minor
---

Svelte 5 apps can now add the CookieYes consent banner with `@cookieyes/svelte`, with the same banner, dialogs and recall button as the React adapter.

**New: `@cookieyes/svelte`.** Wrap your consent UI in `<CookieYesProvider {config}>`, which takes the same configuration as `initCookieYes` in `@cookieyes/core` and `@cookieyes/react`. Render `CookieBanner`, `CookiePreferences` and `RecallButton`, or build your own from the `Banner`, `Preferences` and `OptOut` parts, which are exported both as namespaces and as flat names such as `BannerRoot`. Hooks such as `useConsent` and `useConsentCategory` keep React's names. A hook that returns a single value, such as `useConsentCategory`, returns it as `{ current }`. Import `@cookieyes/svelte/styles.css`; without it the banner renders unstyled. Requires Svelte 5.20 or later.
