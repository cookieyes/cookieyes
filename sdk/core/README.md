# @cookieyes/core

The headless consent engine powering the CookieYes SDK. Zero UI, zero runtime dependencies. This is the single source of truth for all consent logic — every framework adapter imports from this package exclusively.

## Install

```bash
npm install @cookieyes/core
pnpm add @cookieyes/core
yarn add @cookieyes/core
bun add @cookieyes/core
```

## Which API should I use?

**`consentStore.subscribe` is the recommended way to read consent outside
React.** See the [shared decision tree](../../docs/which-api-should-i-use.md)
if you're not sure which API applies to your situation — core also exposes a
handful of lower-level options (below) for specific edge cases.

## Usage

The recommended entry point is `getOrCreateConsentRuntime()`. It returns a
process-wide singleton with a `consentStore` (reactive state) and a
`consentManager` (imperative API).

```ts
import { getOrCreateConsentRuntime } from "@cookieyes/core";

const { consentManager, consentStore } = getOrCreateConsentRuntime({
  mode: "cookie-only",                      // "cookie-only" | "self-hosted"
  overrides: { regulation: "GDPR" },        // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system",                    // "light" | "dark" | "system"
});

// consentStore.subscribe fires on every state change — category saves,
// transient preference-dialog toggles, and the dialog opening/closing.
// That's the right level for "should this script run right now?" checks:
const unsubscribe = consentStore.subscribe((state) => {
  if (state.has("analytics")) {
    // load analytics scripts (gtag, Mixpanel, …)
  }
  if (state.has("advertisement")) {
    // load ad scripts (Meta Pixel, Google Ads, …)
  }
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

Pass `mode: "self-hosted"` with either a `backendURL` (the SDK POSTs a
`ConsentPayload` to it) or a custom `backend` adapter for full control:

```ts
getOrCreateConsentRuntime({
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

### Deprecated: `mode: "offline"`

`"offline"` was renamed to `"cookie-only"` — same behavior, clearer name. It
still works today and logs a one-time console warning, and will be removed
3 releases from now.

```diff
 getOrCreateConsentRuntime({
-  mode: "offline",
+  mode: "cookie-only",
 });
```

## API

### `getOrCreateConsentRuntime(options)`

Returns `{ consentManager, consentStore }` (a singleton — call
`resetConsentRuntime()` to clear it, primarily for tests).

**`options`** (`ConsentRuntimeOptions`):

| Option | Type | Notes |
|--------|------|-------|
| `mode` | `"cookie-only" \| "self-hosted"` | **Required.** See [Deprecated](#deprecated-mode-offline) for the retired `"offline"` name. |
| `backendURL` | `string` | Self-hosted: endpoint the payload is POSTed to. |
| `backend` | `ConsentBackend` | Self-hosted: custom `persist(payload)` adapter. |
| `apiKey` | `string` | Optional auth key. |
| `overrides.regulation` | `"GDPR" \| "CCPA" \| "DEFAULT"` | Force the applicable regulation. |
| `colorScheme` | `"light" \| "dark" \| "system"` | |
| `theme` | `ThemeConfig` | Color / spacing tokens. |
| `i18n` | `I18nConfig` | Translation messages / locale. |
| `networkBlocker` | `NetworkBlockerConfig` | Block network requests by category. |
| `reloadOnRevoke` | `boolean` | Reload the page when consent is revoked. |
| `onConsentReady` / `onConsentUpdate` | `(state) => void` | Low-level lifecycle callbacks — see below. |

**`consentStore`** — `subscribe(listener)` and `getState()`. State
(`ConsentStoreState`) includes `consentId`, `hasActed`, `categories`,
`regulation`, `lastRenewed`, `activeUI`, plus the methods `has()`,
`saveConsents()`, `setConsent()`, and the low-level `subscribeToConsentChanges()`
(below).

> The applicable regulation comes from your configuration
> (`overrides.regulation` / `config.regulation`) and defaults to `"DEFAULT"`.
> The core engine does not perform IP-based geo-detection.

## Low-level / advanced API

You shouldn't need these for a typical integration — each exists for a
specific narrower situation than `consentStore.subscribe`:

| API | Use when |
|---|---|
| `subscribeToConsentChanges(listener)` (on `consentStore.getState()`) | You only care about *saved* consent decisions (accept/reject/save), not every transient toggle or dialog open/close that `subscribe` also reports. |
| `onConsentReady` (config option) | You need a one-time callback right after the initial state is known — e.g. conditionally loading analytics on first load — rather than an ongoing subscription. |
| `onConsentUpdate` (config option) | Like `subscribeToConsentChanges`, scoped to saved changes only, but registered once at config time instead of dynamically after mount. Prefer `subscribeToConsentChanges` unless you specifically need a config-time callback. |
| `createConsentManager(config)` | Bypasses `consentStore` entirely for direct access to the manager: `acceptAll()`, `rejectAll()`, `acceptSelected(cats)`, `updateCategory(cat, val)`, `savePreferences()`, `resetConsent()`, `showPreferences()`, `hidePreferences()`, `subscribe(fn)`, `registerScript(entry)`. `config` (`ConsentConfig`) accepts `regulation`, `colorScheme`, `theme`, `apiUrl`, `apiKey`, `backend`, `reloadOnRevoke`, `onConsentReady`, `onConsentUpdate`. |
| `parseCookie` / `serializeCookie` | Reading or writing the raw `cookieyes-consent` cookie directly — e.g. in a Next.js Server Component or route handler, where no live runtime or React hooks are available. |

## Stopping tracking when consent is withdrawn

When a visitor revokes consent, the SDK stops tracking **without reloading the
page** — nothing they were doing (form input, scroll position, an open dialog)
is lost. There are three layers:

1. **Network blocking** (`networkBlocker` / `blockNetwork`) — intercepts
   `fetch`, `XMLHttpRequest`, **and `navigator.sendBeacon`** to blocked domains,
   in real time, for as long as the page is open. `sendBeacon` matters because
   GA4/Meta use it for exit/unload tracking that fetch/XHR interception misses.
2. **Integration stop-handlers** (`integrations`) — call a vendor's own
   documented "stop" API on revoke, and resume it on re-accept:

   ```ts
   getOrCreateConsentRuntime({
     mode: "cookie-only",
     integrations: [
       { vendor: "ga4" },   // Consent Mode v2: gtag('consent','update',{ analytics_storage })
       { vendor: "meta" },  // fbq('consent','revoke'|'grant')
     ],
   });
   ```

   > **GA4 uses Google Consent Mode v2.** The SDK sends the `update` on every
   > consent change (`analytics_storage: 'granted'|'denied'`). You must set the
   > **deny-by-default** state yourself, in your gtag bootstrap snippet *before*
   > GA loads — the SDK can't set the `default` because it doesn't control that
   > load order:
   >
   > ```js
   > gtag('consent', 'default', { analytics_storage: 'denied', wait_for_update: 500 });
   > ```
3. **Your own scripts** (`customStopHandlers`) — for anything without a built-in
   integration. Provide a clean `stop()`/`resume()`, or register it as
   reload-only so revoking it shows the reload notice rather than silently
   continuing to track:

   ```ts
   customStopHandlers: [
     { id: "my-tool", category: "analytics", stop: () => window.myTool?.disable() },
     { id: "legacy-widget", category: "advertisement", needsReload: true },
   ]
   ```

### Vendor audit — which stop cleanly, which need a reload

| Vendor | Runtime stop | How |
|--------|-------------|-----|
| **GA4** (gtag.js) | ✅ clean | Consent Mode v2 — `gtag('consent','update',{ analytics_storage })`. Set the deny-by-default state in your gtag snippet. |
| **Google Tag Manager** | ✅ clean | Consent Mode v2 — GTM-managed tags honor `gtag('consent','update',…)` at runtime (per Google's tag-platform consent docs). Maps to `analytics_storage`. |
| **Meta Pixel** | ✅ clean | `fbq('consent', 'revoke')` / `'grant'` |
| TikTok Pixel | ⚠️ reload | No runtime stop we could confidently verify; modelled as reload-only. |
| LinkedIn Insight Tag | ⚠️ reload | No documented runtime opt-out after load. |
| Hotjar | ⚠️ reload | No documented "stop after load"; gate before load instead. |
| Segment (analytics.js) | ⚠️ reload | No documented runtime "stop all"; gate `analytics.load()`. |

"Reload" vendors surface the reload notice (below) on a genuine revoke — the SDK
never continues tracking them silently. Any of them can be upgraded to a clean
stop later (in `resolveBuiltInIntegration`) once a real runtime API is confirmed.

### Reload notice

If a revoked tool has no clean runtime stop, the manager computes
`manager.reloadNotice` (`{ required, reasons }`) automatically on revoke, with
`manager.dismissReloadNotice()` to clear it. The *state* is automatic; showing
it is up to you.

**If you configure any reload-only tool, surface this state to the visitor** —
otherwise a revoke that needs a reload is silent and that tool keeps running.
In React that means rendering the built-in `<ReloadNotice />` (dismissible,
`role="alert"`, wording via translations); it never reloads on its own. Outside
React, read `manager.reloadNotice.required` and render your own prompt.

### `reloadOnRevoke` (legacy, off by default)

`reloadOnRevoke` performs a full page reload on revoke. It is **off by default**
— the clean stop-handlers above are the safe path. Turn it on only if you
explicitly want the old behavior; note it erases whatever the visitor was doing.

## Consent categories

`necessary` (always on), `functional`, `analytics`, `performance`, `advertisement`.

## Cookie

Consent is persisted in the `cookieyes-consent` cookie (`SameSite=Lax`, `path=/`).
Use `parseCookie` / `serializeCookie` from this package to read or write it directly.

## License

MIT — see [LICENSE](./LICENSE).
