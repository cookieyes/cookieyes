<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner — powered by @cookieyes/core" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/core</h1>

<p align="center"><strong>The headless consent engine powering the CookieYes SDK.</strong></p>

<p align="center">Zero UI, zero runtime dependencies — the single source of truth for all consent logic. Every framework adapter imports from this package.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/core"><img src="https://img.shields.io/npm/v/@cookieyes/core" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/core"><img src="https://img.shields.io/npm/dw/@cookieyes/core" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/core" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#api">API</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md">Docs</a>
</p>

---

## Building a UI? Use an adapter

`@cookieyes/core` is the headless engine — it has **no components**. Most developers want a
framework adapter, which bundles core plus ready-made banner/dialog UI:

- **[`@cookieyes/react`](https://github.com/cookieyes/cookieyes/tree/main/sdk/react)** — React components + hooks.
- **[`@cookieyes/nextjs`](https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs)** — Next.js App Router / Pages Router.

Use `@cookieyes/core` directly only for vanilla JS, a custom framework, or your own UI.

## Key features

- **Headless engine** — all consent logic, no UI, no framework assumptions.
- **Zero dependencies** — nothing pulled into your bundle but the engine itself.
- **Offline or self-hosted** — cookie-only, or POST every decision to your own backend.
- **GDPR & CCPA** — regulation-aware consent state and payloads.
- **Cookie utilities** — read/write/parse the consent cookie directly if you need to.

## Prerequisites

- **Node.js** ≥ 20
- A JavaScript environment with `document`/`window` (browser or SSR with a DOM). No framework required.

## Quick start

**1. Install**

```bash
npm install @cookieyes/core
pnpm add @cookieyes/core
yarn add @cookieyes/core
bun add @cookieyes/core
```

**2. Initialise the runtime**

> **Which API should I use?** `consentStore.subscribe` is the recommended way to
> read consent outside React. See the [shared decision tree](../../docs/which-api-should-i-use.md)
> if you're not sure which API applies to your situation — core also exposes a
> handful of lower-level options (see [Low-level / advanced API](#low-level--advanced-api))
> for specific edge cases.

`initCookieYes()` (an alias of `getOrCreateConsentRuntime()`) returns a process-wide singleton
with a `consentStore` (reactive state) and a `consentManager` (imperative API).

```ts
import { initCookieYes } from "@cookieyes/core";

const { consentManager, consentStore } = initCookieYes({
  mode: "cookie-only",   // "cookie-only" | "self-hosted"
  regulation: "GDPR",    // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system", // "light" | "dark" | "system"
});
```

**3. React to consent changes**

```ts
// consentStore.subscribe fires on every state change — category saves,
// transient preference-dialog toggles, and the dialog opening/closing.
// That's the right level for "should this script run right now?" checks:
const unsubscribe = consentStore.subscribe((state) => {
  if (state.has("analytics")) {
    // load analytics scripts (gtag, Mixpanel, …)
  }
});

// Only saved preference changes (not transient UI toggles)
consentStore
  .getState()
  .subscribeToConsentChanges(({ allowedCategories, deniedCategories }) => {
    console.log("Allowed:", allowedCategories, "Denied:", deniedCategories);
  });
```

**4. Drive it imperatively**

```ts
consentStore.getState().has("analytics");          // → boolean
consentStore.getState().saveConsents("all");        // accept all
consentStore.getState().saveConsents("necessary");  // reject all (necessary only)
consentStore.getState().setConsent("analytics", true);
consentManager.showPreferences();                    // open the preferences dialog
consentManager.resetConsent();                       // clear + re-prompt
unsubscribe();
```

### Self-hosted mode

`mode: "self-hosted"` POSTs a `ConsentPayload` to your endpoint on every decision. Provide
either an `apiUrl` or a custom `backend` adapter for full control:

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

### `initCookieYes(config)` / `getOrCreateConsentRuntime(config)`

Both accept the canonical `CookieYesConfig` and return `{ consentManager, consentStore }` (a
singleton — call `resetConsentRuntime()` to clear it, mainly for tests). `initCookieYes` is an
alias provided so one setup name reads across every package. Every option is documented once in
**[Configuration](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md)**.
Migrating off the deprecated `overrides.regulation` / `backendURL` keys? See the
**[migration guide](https://github.com/cookieyes/cookieyes/blob/main/docs/migration/builder-to-config.md)**.

**`config`** (`CookieYesConfig`):

| Option | Type | Notes |
|--------|------|-------|
| `mode` | `"cookie-only" \| "self-hosted"` | **Required.** See [Deprecated](#deprecated-mode-offline) for the retired `"offline"` name. |
| `regulation` | `"GDPR" \| "CCPA" \| "DEFAULT"` | Force the applicable regulation. (The deprecated `overrides.regulation` alias still works.) |
| `apiUrl` | `string` | Self-hosted: endpoint the payload is POSTed to. (The deprecated `backendURL` alias still works.) |
| `backend` | `ConsentBackend` | Self-hosted: custom `persist(payload)` adapter. |
| `apiKey` | `string` | Optional auth key. |
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

### `createConsentManager(config)` (low-level)

The underlying manager, if you want to bypass the store. Returns a `ConsentManager` with state
(`consentId`, `hasActed`, `categories`, `regulation`, `lastRenewed`, `isPreferencesOpen`) and
methods (`acceptAll()`, `rejectAll()`, `acceptSelected(cats)`, `updateCategory(cat, val)`,
`savePreferences()`, `resetConsent()`, `showPreferences()`, `hidePreferences()`, `subscribe(fn)`,
`registerScript(entry)`).

> The applicable regulation comes from your top-level `regulation` config (the deprecated
> `overrides.regulation` alias still works) and defaults to `"DEFAULT"`. The core engine does not
> perform IP-based geo-detection.

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
       { vendor: "meta" },  // fbq('consent','revoke'|'grant')
     ],
   });
   ```

   > **Google Analytics & Tag Manager are handled automatically** — you don't
   > list them here. The SDK broadcasts Google Consent Mode v2 whenever a
   > `dataLayer` is present (see [Google Consent Mode](#google-consent-mode-v2)
   > below). You still set the **deny-by-default** state in your gtag snippet.
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
| **Google Analytics 4 / Tag Manager** | ✅ automatic | Consent Mode v2 broadcast — no `integrations` entry needed (see [below](#google-consent-mode-v2)). |
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

By default the SDK ships the familiar five:

`necessary` (always on), `functional`, `analytics`, `performance`, `advertisement`.

Configure nothing and you get exactly these, unchanged.

### Defining your own categories

Pass a `categories` array to use your own taxonomy — rename, add, remove, or
restructure. Each entry is a [`CategoryDef`](./src/categories.ts):

```ts
getOrCreateConsentRuntime({
  mode: "cookie-only",
  categories: [
    { id: "essential", required: true, label: "Strictly Necessary" },
    { id: "marketing", label: "Marketing & Ads",
      gcm: ["ad_storage", "ad_user_data", "ad_personalization"] },
    { id: "insights", label: "Product Insights",
      gcm: ["analytics_storage"] },
  ],
});
```

- **`id`** — the stable key stored in the cookie and used everywhere (banner,
  preferences UI, read APIs, `gate`/integration category names, events). Pick it
  once and keep it stable; renaming an `id` is a taxonomy change (see below).
- **`required`** — the always-on, non-optional category. **Mark it explicitly** —
  it is *never* inferred from the name `necessary`, so you can rename it freely.
  At least one category must be `required: true`.
- **`label` / `description`** — shown in the preferences UI. For the five
  built-in ids these fall back to the translation strings if omitted; for a
  custom id with no `label`, the UI falls back to the `id` itself.
- **`gcm`** — which Google Consent Mode signals this category governs (see
  [below](#google-consent-mode-v2)).

**Id rules.** An `id` must be a non-empty string, unique within the list, and
must not contain `,` or `:` or be one of the cookie's reserved keys (`consentid`,
`consent`, `action`, `tax`, `lastRenewedDate`) — those would corrupt the stored
cookie. Otherwise any string is fine (spaces and unicode are OK).

**Invalid config is safe.** If the array is empty, has duplicate/reserved/invalid
ids, or has no `required` category, the SDK logs a `console.warn` and falls back
to the built-in five rather than leaving you a broken or unprotected banner.

### Changing your taxonomy later (upgrade behaviour)

Every stored consent record is stamped with a **taxonomy signature** (a hash of
the ids, `required` flags, and `gcm` mappings — visible as `taxonomyHash` on the
snapshot and `tax:` in the cookie). This lets the SDK tell what a returning
visitor actually agreed to.

- **Signature unchanged** → the returning visitor's stored consent is reused
  silently. No re-prompt.
- **Signature changed** (you renamed/added/removed a category or changed a `gcm`
  mapping) → the SDK **re-requests consent**: it discards the stale record and
  shows the banner again, so the visitor consents against the taxonomy that's
  actually in effect. This is the one documented outcome for a taxonomy change.
- **Legacy cookies** written before this feature (no `tax:` stamp) are treated
  as the built-in five: if you're still on the default taxonomy they're honoured
  as-is (returning visitors are **never** silently reset by upgrading the SDK);
  if you've since moved to a custom taxonomy they re-request like any other
  change.

## Google Consent Mode v2

If a Google `dataLayer` is present on the page, the SDK **broadcasts** all seven
Consent Mode v2 signals — on load and on every consent change — for every
visitor. This is what governs Google Analytics 4 and Tag Manager; you do **not**
register them under `integrations`.

Each signal is `granted` when any granted category maps to it (via its `gcm`
field), otherwise `denied`. `security_storage` is always `granted`. The built-in
five map like this:

| Category | GCM signals |
|----------|-------------|
| `necessary` | *(none — `security_storage` is always granted)* |
| `functional` | `functionality_storage`, `personalization_storage` |
| `analytics` | `analytics_storage` |
| `performance` | *(none)* |
| `advertisement` | `ad_storage`, `ad_user_data`, `ad_personalization` |

Under the hood the broadcast does the equivalent of:

```js
dataLayer.push(["consent", "update", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted",
  functionality_storage: "granted",
  personalization_storage: "granted",
  security_storage: "granted",
}]);
```

> **You still own the default.** Consent Mode requires a **deny-by-default**
> state set *before* your Google tags load — the SDK can't set it because it
> doesn't control that load order. Put it in your gtag bootstrap snippet:
>
> ```js
> gtag('consent', 'default', {
>   ad_storage: 'denied',
>   ad_user_data: 'denied',
>   ad_personalization: 'denied',
>   analytics_storage: 'denied',
>   functionality_storage: 'denied',
>   personalization_storage: 'denied',
>   security_storage: 'granted',
>   wait_for_update: 500,
> });
> ```
>
> Set all seven signals explicitly: deny the six consent-gated ones and grant
> `security_storage` (it's strictly necessary). Leaving any signal unspecified
> makes Google treat it as granted until the SDK's `update` fires, leaking it for
> that first moment. The SDK owns the `update`; you own the `default`.

To wire Consent Mode to a **custom** taxonomy, put the `gcm` field on whichever
of your categories should drive each signal — see the example under
[Defining your own categories](#defining-your-own-categories) (the `marketing`
and `insights` entries carry `gcm` mappings). A signal no category maps to
simply stays `denied`.

## Cookie

Consent is persisted in the `cookieyes-consent` cookie (`SameSite=Lax`, `path=/`).
It stores each category id as `id:yes|no`, plus a `tax:` stamp recording the
[taxonomy signature](#changing-your-taxonomy-later-upgrade-behaviour) that was in
effect when the consent was recorded. Use `parseCookie` / `serializeCookie` from
this package to read or write it directly.

## Troubleshooting

**The runtime isn't initialising (or hooks/consumers see no state).**
`initCookieYes()` returns a **singleton** — the first call wins, later calls return the same
instance. Call it once at startup before anything reads consent. In tests, call
`resetConsentRuntime()` between cases or state leaks across them.

**Mode / config type errors.**
`CookieYesConfig` is a discriminated union on `mode`. Backend keys (`apiUrl`, `apiKey`,
`backend`) are only valid with `mode: "self-hosted"` — supplying them under `mode: "cookie-only"`
is a compile error. `mode: "self-hosted"` needs either `apiUrl` or a `backend` adapter.

**Consent doesn't persist between reloads.**
State lives in the `cookieyes-consent` cookie. Confirm it isn't blocked by a browser privacy
setting or extension, that you're on a `document`-bearing environment (not a bare Node worker),
and that you aren't calling `resetConsentRuntime()` on every load.

Still stuck? [Open an issue](https://github.com/cookieyes/cookieyes/issues).

## Community & support

- [Open an issue](https://github.com/cookieyes/cookieyes/issues) — bug reports and feature requests.
- Email — [support@cookieyes.com](mailto:support@cookieyes.com).
- [Full documentation](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md).

_(A community chat channel is on the roadmap.)_

## Contributing

Contributions are welcome. Read our
[Contributing Guidelines](https://github.com/cookieyes/cookieyes/blob/main/CONTRIBUTING.md) and
[Code of Conduct](https://github.com/cookieyes/cookieyes/blob/main/CODE_OF_CONDUCT.md), then open
a pull request.

### Security

Found a vulnerability? **Do not open a public issue** — follow our
[Security Policy](https://github.com/cookieyes/cookieyes/blob/main/SECURITY.md) and use GitHub's
private vulnerability reporting.

## License

MIT — see [LICENSE](./LICENSE).
