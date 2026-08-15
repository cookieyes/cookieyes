---
"@cookieyes/scripts": minor
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Add consent-gated third-party integrations.

- New **`@cookieyes/scripts`** package with ready-made presets (Segment, Meta Pixel, and Google Analytics 4 via Consent Mode — Google Ads and GTM to follow) plus a `customScript` helper for any other tag. Pass them to the `integrations` config: `initCookieYes({ integrations: [segment({ writeKey })] })`.
- For Google, **`@cookieyes/nextjs/server`** exports `<GoogleConsentMode />` — the deny-by-default snippet for the page `<head>` (also available as `googleConsentModeSnippet()` / `bootstrapGoogleConsentMode()` for non-Next apps), so a returning visitor's saved choice applies from first paint.
- New generic integration engine in core. Each integration declares two things: `load` (`"immediately"` | `"afterConsent"`) and `onRevoke` (`"keep"` | `"remove"` | `"silence"`). The runtime loads it once its category is granted (or immediately for Google Consent Mode), and removes or silences it on withdrawal — reconciling on every consent change.
- **Breaking rename.** The old `integrations` field — built-in vendor stop-handlers such as `{ vendor: "meta" }` — is **renamed to `builtInIntegrations`**, because the `integrations` name now takes the new presets. **Existing `integrations: [{ vendor: … }]` code will no longer work** as written — move those entries to `builtInIntegrations`. That field keeps working but is deprecated (logs a warning) and will be removed in a future release.
- The SDK warns if the same vendor is configured in both `integrations` and `builtInIntegrations`, which would load it twice (e.g. a double-counted Meta pixel).
