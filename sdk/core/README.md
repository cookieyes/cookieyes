# @cookieyes/core

The headless consent engine powering the CookieYes SDK. Zero UI, zero runtime dependencies. This is the single source of truth for all consent logic — every framework adapter imports from this package exclusively.

## Install

```bash
npm install @cookieyes/core
pnpm add @cookieyes/core
yarn add @cookieyes/core
bun add @cookieyes/core
```

## Usage

The recommended entry point is `initCookieYes()` (an alias of
`getOrCreateConsentRuntime()`). It returns a process-wide singleton with a
`consentStore` (reactive state) and a `consentManager` (imperative API).

```ts
import { initCookieYes } from "@cookieyes/core";

const { consentManager, consentStore } = initCookieYes({
  mode: "offline",       // "offline" (cookie-only) | "self-hosted"
  regulation: "GDPR",    // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system", // "light" | "dark" | "system"
});

// React to every saved state change
const unsubscribe = consentStore.subscribe((state) => {
  if (state.has("analytics")) {
    // load analytics scripts (gtag, Mixpanel, …)
  }
  if (state.has("advertisement")) {
    // load ad scripts (Meta Pixel, Google Ads, …)
  }
});

// React only to saved preference changes (not transient UI toggles)
consentStore
  .getState()
  .subscribeToConsentChanges(({ allowedCategories, deniedCategories }) => {
    console.log("Allowed:", allowedCategories);
    console.log("Denied:", deniedCategories);
  });

// Imperative actions
consentStore.getState().has("analytics");           // → boolean
consentStore.getState().saveConsents("all");         // accept all
consentStore.getState().saveConsents("necessary");   // reject all (necessary only)
consentStore.getState().setConsent("analytics", true);
consentManager.showPreferences();                    // open the preferences dialog
consentManager.resetConsent();                       // clear + re-prompt

unsubscribe();
```

### Self-hosted mode

Pass `mode: "self-hosted"` with either an `apiUrl` (the SDK POSTs a
`ConsentPayload` to it) or a custom `backend` adapter for full control:

```ts
initCookieYes({
  mode: "self-hosted",
  backend: {
    async persist(payload) {
      await fetch("https://your-backend.example.com/v1/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  },
});
```

## API

### `initCookieYes(config)` / `getOrCreateConsentRuntime(config)`

Both accept the canonical `CookieYesConfig` and return
`{ consentManager, consentStore }` (a singleton — call `resetConsentRuntime()`
to clear it, primarily for tests). `initCookieYes` is an alias of
`getOrCreateConsentRuntime` provided so docs use one setup name everywhere.

Every configuration option is documented once in
**[Configuration](../../docs/configuration.md)**. Migrating off the deprecated
`overrides.regulation` / `backendURL` keys? See the
**[migration guide](../../docs/migration/builder-to-config.md)**.

**`consentStore`** — `subscribe(listener)` and `getState()`. State
(`ConsentStoreState`) includes `consentId`, `hasActed`, `categories`,
`regulation`, `lastRenewed`, `activeUI`, plus the methods `has()`,
`saveConsents()`, `setConsent()`, and `subscribeToConsentChanges()`.

### `createConsentManager(config)` (low-level)

The underlying manager, if you want to bypass the store. Returns a
`ConsentManager` with:

- **State**: `consentId`, `hasActed`, `categories`, `regulation`, `lastRenewed`, `isPreferencesOpen`
- **Methods**: `acceptAll()`, `rejectAll()`, `acceptSelected(cats)`, `updateCategory(cat, val)`, `savePreferences()`, `resetConsent()`, `showPreferences()`, `hidePreferences()`, `subscribe(fn)`, `registerScript(entry)`

`config` (`ConsentConfig`) accepts: `regulation`, `colorScheme`, `theme`,
`apiUrl`, `apiKey`, `backend`, `reloadOnRevoke`, `onConsentReady`,
`onConsentUpdate`.

> The applicable regulation comes from your top-level `regulation` config and
> defaults to `"DEFAULT"`. The core engine does not perform IP-based
> geo-detection.

## Consent categories

`necessary` (always on), `functional`, `analytics`, `performance`, `advertisement`.

## Cookie

Consent is persisted in the `cookieyes-consent` cookie (`SameSite=Lax`, `path=/`).
Use `parseCookie` / `serializeCookie` from this package to read or write it directly.

## License

MIT — see [LICENSE](./LICENSE).
