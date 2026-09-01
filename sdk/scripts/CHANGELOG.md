# @cookieyes/scripts

## 0.2.0

### Minor Changes

- af924c0: Add PostHog and Microsoft Clarity integrations.

  - **`posthog()` / `posthogSync()`** — PostHog (`posthog-js`), consent-gated. `posthog()` loads it from a project API key; `posthogSync()` keeps consent in sync with a PostHog you already load yourself. A **required** `onReject` choice, no default: `"stop"` (loads after consent; removes the script and clears `ph_<key>_posthog` + the opt-out preference on withdrawal) or `"anonymous"` (loads immediately and counts visits cookie-free via `cookieless_mode`, opting in/out on consent change). `region: "us" | "eu"` or a custom `apiHost` for self-hosted/reverse-proxied setups. Consent is driven only by CookieYes's own record, never PostHog's `has_opted_*` check.
  - **`clarity()`** — Microsoft Clarity (session recording + heatmaps), consent-gated. Loads after consent and drives Clarity's Consent v2 API — granted on consent, denied on withdrawal (`onRevoke: "silence"`); Clarity then deletes its own `_clck` / `_clsk` cookies and keeps running cookie-free, rather than being torn off the page. Requires Consent Mode on in the Clarity project.

### Patch Changes

- Updated dependencies [ae888a9]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
- Updated dependencies [e2baba4]
  - @cookieyes/core@0.5.0

## 0.1.1

### Patch Changes

- Fix an unusable `@cookieyes/core` dependency. 0.0.0 and 0.1.0 were published with
  `"@cookieyes/core": "workspace:*"` — pnpm's workspace protocol, which npm and yarn
  cannot resolve, so installing this package failed with `EUNSUPPORTEDPROTOCOL`. Both
  are deprecated; use 0.1.1 or later.

## 0.1.0

### Minor Changes

- 73bd445: Add consent-gated third-party integrations.

  - New **`@cookieyes/scripts`** package with ready-made presets — Segment, Meta Pixel, and Google (GA4, Ads, and Tag Manager via Consent Mode) — plus a `customScript` helper for any other tag. Pass them to the `integrations` config: `initCookieYes({ integrations: [segment({ writeKey })] })`. Google products share one `gtag.js`/dataLayer, so `ga4()` + `googleAds()` compose without loading the library twice.
  - For Google, **`@cookieyes/nextjs/server`** exports `<GoogleConsentMode />` — the deny-by-default snippet for the page `<head>` (also available as `googleConsentModeSnippet()` / `bootstrapGoogleConsentMode()` for non-Next apps), so a returning visitor's saved choice applies from first paint.
  - New generic integration engine in core. Each integration declares two things: `load` (`"immediately"` | `"afterConsent"`) and `onRevoke` (`"keep"` | `"remove"` | `"silence"`). The runtime loads it once its category is granted (or immediately for Google Consent Mode), and removes or silences it on withdrawal — reconciling on every consent change.
  - **Breaking rename.** The old `integrations` field — built-in vendor stop-handlers such as `{ vendor: "meta" }` — is **renamed to `builtInIntegrations`**, because the `integrations` name now takes the new presets. **Existing `integrations: [{ vendor: … }]` code will no longer work** as written — move those entries to `builtInIntegrations`. That field keeps working but is deprecated (logs a warning) and will be removed in a future release. If an old `{ vendor }` entry is left in `integrations`, the SDK skips it with a targeted warning pointing to `builtInIntegrations`, rather than failing silently.
  - The SDK warns if the same vendor is configured in both `integrations` and `builtInIntegrations`, which would load it twice (e.g. a double-counted Meta pixel).

### Patch Changes

- Updated dependencies [95c56c9]
- Updated dependencies [e25dc2f]
- Updated dependencies [f4e54aa]
- Updated dependencies [73bd445]
- Updated dependencies [b436f2c]
  - @cookieyes/core@0.4.0
