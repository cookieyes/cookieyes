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

`initCookieYes()` (an alias of `getOrCreateConsentRuntime()`) returns a process-wide singleton
with a `consentStore` (reactive state) and a `consentManager` (imperative API).

```ts
import { initCookieYes } from "@cookieyes/core";

const { consentManager, consentStore } = initCookieYes({
  mode: "offline",       // "offline" = cookie-only, no backend | "self-hosted"
  regulation: "GDPR",    // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system", // "light" | "dark" | "system"
});
```

**3. React to consent changes**

```ts
// Every saved state change
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

## API

### `initCookieYes(config)` / `getOrCreateConsentRuntime(config)`

Both accept the canonical `CookieYesConfig` and return `{ consentManager, consentStore }` (a
singleton — call `resetConsentRuntime()` to clear it, mainly for tests). `initCookieYes` is an
alias provided so one setup name reads across every package. Every option is documented once in
**[Configuration](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md)**.
Migrating off the deprecated `overrides.regulation` / `backendURL` keys? See the
**[migration guide](https://github.com/cookieyes/cookieyes/blob/main/docs/migration/builder-to-config.md)**.

**`consentStore`** — `subscribe(listener)` and `getState()`. State (`ConsentStoreState`) includes
`consentId`, `hasActed`, `categories`, `regulation`, `lastRenewed`, `activeUI`, plus `has()`,
`saveConsents()`, `setConsent()`, and `subscribeToConsentChanges()`.

### `createConsentManager(config)` (low-level)

The underlying manager, if you want to bypass the store. Returns a `ConsentManager` with state
(`consentId`, `hasActed`, `categories`, `regulation`, `lastRenewed`, `isPreferencesOpen`) and
methods (`acceptAll()`, `rejectAll()`, `acceptSelected(cats)`, `updateCategory(cat, val)`,
`savePreferences()`, `resetConsent()`, `showPreferences()`, `hidePreferences()`, `subscribe(fn)`,
`registerScript(entry)`).

> The applicable regulation comes from your top-level `regulation` config and defaults to
> `"DEFAULT"`. The core engine does not perform IP-based geo-detection.

## Consent categories

`necessary` (always on), `functional`, `analytics`, `performance`, `advertisement`.

## Cookie

Consent is persisted in the `cookieyes-consent` cookie (`SameSite=Lax`, `path=/`). Use
`parseCookie` / `serializeCookie` to read or write it directly.

## Troubleshooting

**The runtime isn't initialising (or hooks/consumers see no state).**
`initCookieYes()` returns a **singleton** — the first call wins, later calls return the same
instance. Call it once at startup before anything reads consent. In tests, call
`resetConsentRuntime()` between cases or state leaks across them.

**Mode / config type errors.**
`CookieYesConfig` is a discriminated union on `mode`. Backend keys (`apiUrl`, `apiKey`,
`backend`) are only valid with `mode: "self-hosted"` — supplying them under `mode: "offline"`
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
