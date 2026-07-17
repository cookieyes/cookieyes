<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner rendered in a browser" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/react</h1>

<p align="center"><strong>The consent SDK React developers actually enjoy using.</strong></p>

<p align="center">Drop-in cookie banner, preferences dialog, and consent hooks for any React app — headless, themeable, and TypeScript-first.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/react"><img src="https://img.shields.io/npm/v/@cookieyes/react" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/react"><img src="https://img.shields.io/npm/dw/@cookieyes/react" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/react" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#usage">API</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md">Docs</a>
</p>

---

> **Free-tier note:** the "Powered by CookieYes" attribution in the banner may not be removed
> on the free tier. Paid plans remove it.

---

## Key features

- **Drop-in components** — banner, preferences dialog, and recall button work out of the box, no wiring required.
- **Fully themeable** — every color, radius, and font is a token you control, or override with your own CSS.
- **GDPR & CCPA** — built-in opt-in (GDPR) and "Do Not Sell" opt-out (CCPA) flows.
- **Headless primitives** — compose your own UI from low-level slots when the presets aren't enough.
- **Script gating** — block analytics and ad scripts until consent is granted, with one component.
- **React hooks** — read and change consent state anywhere in your component tree.
- **Tiny & tree-shakeable** — TypeScript-first, one dependency (`@cookieyes/core`).

## Prerequisites

- **Node.js** ≥ 20
- **React** ≥ 18 and **React DOM** ≥ 18 (peer dependencies)
- A browser environment. For the Next.js App Router / Server Components, use [`@cookieyes/nextjs`](https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs).

## Quick start

Get a working banner in under 5 minutes.

**1. Install the package**

```bash
npm install @cookieyes/react
pnpm add @cookieyes/react
yarn add @cookieyes/react
bun add @cookieyes/react
```

**2. Configure the runtime and render the components**

Both the `initCookieYes` call and the components must live in a `"use client"` module.

```tsx
// components/consent-manager.tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  initCookieYes,
} from "@cookieyes/react";

initCookieYes({
  mode: "offline",       // "offline" = cookie-only, no backend needed | "self-hosted"
  regulation: "GDPR",    // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system", // "light" | "dark" | "system"
});

export function CookieYesRoot() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <RecallButton />
    </>
  );
}
```

**3. Render it once near the root of your app**

```tsx
import { CookieYesRoot } from "./components/consent-manager";

function App() {
  return (
    <>
      <YourApp />
      <CookieYesRoot />
    </>
  );
}
```

**4. Done.** The banner appears on page load until the user acts. If it doesn't, see [Troubleshooting](#troubleshooting).

> Prefer zero manual setup? Run `npx @cookieyes/cli init` and the CLI wires all of this up for you.

## Usage

`initCookieYes(config)` takes the canonical `CookieYesConfig` object — the same shape accepted
by `@cookieyes/core` and `@cookieyes/nextjs`, copy-pasteable between them with zero edits. The
full option reference (modes, `theme`, `i18n`, self-hosted persistence, callbacks) lives in
**[Configuration](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md)**.

| Option | Type | Notes |
|--------|------|-------|
| `mode` | `"offline" \| "self-hosted"` | **Required.** `offline` = cookie-only, zero network. `self-hosted` = sync to your backend. |
| `regulation` | `"GDPR" \| "CCPA" \| "DEFAULT"` | Which regulation applies. Drives the banner variant. |
| `colorScheme` | `"light" \| "dark" \| "system"` | Theme mode. |
| `theme` | `ThemeConfig` | Color / radius / font tokens (see [Theming](#theming)). |
| `i18n` | `I18nConfig` | Locale translation maps (see [`@cookieyes/translations`](https://github.com/cookieyes/cookieyes/tree/main/sdk/translations)). |
| `apiUrl` / `backend` | `string` / `ConsentBackend` | Self-hosted persistence (`mode: "self-hosted"`). |
| `onConsentReady` / `onConsentUpdate` | `(state) => void` | Lifecycle callbacks. |

> Migrating from the deprecated `createCookieYes()` builder? See the
> [migration guide](https://github.com/cookieyes/cookieyes/blob/main/docs/migration/builder-to-config.md).

### Components

**Presets (styled, drop-in)**

- **`<CookieBanner />`** — the consent banner. Shows until the user acts; renders the CCPA "Do Not Sell" variant when `regulation` is `"CCPA"`.
- **`<CookiePreferences />`** — the per-category preferences dialog.
- **`<CookieOptOut />`** — the CCPA opt-out dialog. Include it when using `regulation: "CCPA"`.

**Controls**

- **`<RecallButton />`** — floating button to reopen preferences after the user has acted.
- **`<GatedScript />`** — registers a third-party script that only loads once its category is consented:

  ```tsx
  <GatedScript
    id="gtm"
    src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"
    category="analytics"
    strategy="afterConsent" // "afterConsent" | "lazyOnce"
  />
  ```

- **`<GatedFrame />`** — blocks an iframe until its category is granted, showing a placeholder otherwise.

**Headless primitives**

For fully custom UIs, compose the slot namespaces `Banner`, `Preferences`, and `OptOut`
(e.g. `Banner.Root`, `Banner.AcceptAll`, `Preferences.Category`). The presets are built from
exactly these primitives.

### Hooks

```tsx
const snapshot = useConsent();
// { consentId, hasActed, categories, regulation, lastRenewed, isPreferencesOpen, isOptOutOpen }

const {
  acceptAll, rejectAll, acceptSelected, save, updateCategory, reset,
  showPreferences, hidePreferences, showOptOut, hideOptOut,
} = useConsentActions();

const analyticsAllowed = useConsentCategory("analytics"); // boolean
const regulation = useRegulation();                       // "GDPR" | "CCPA" | "DEFAULT"
const t = useTranslations();                              // active TranslationMap
const bannerVisible = useBannerVisibility();              // boolean
const prefsOpen = usePreferencesOpen();                   // boolean
const optOutOpen = useOptOutOpen();                       // boolean
```

`useConsentRuntime()` returns the underlying runtime if you need direct access. All hooks are
SSR-safe — they fall back to a stable snapshot when no runtime is mounted.

### Rendering & selector contract

`<CookieBanner />` is **server-rendered**: its markup is in the initial HTML (first-byte paint),
uses fixed positioning (no layout shift / CLS), and issues **no network request on load**
(offline mode makes zero requests; self-hosted only POSTs when the user accepts/rejects/saves).
The `[data-cky-banner]` / `.cy-banner` selectors are a stable, public contract.

### Theming

Pass a `theme` to `initCookieYes`. All values map to CSS custom properties, so you can also
override them in your own stylesheet — **no CSS import is required, styles inject automatically**.
See the theming reference in
**[Configuration](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md#theming)**.

## Troubleshooting

**The banner doesn't appear.**
Make sure `initCookieYes(...)` runs inside a `"use client"` module and `<CookieBanner />` is
rendered near the root. The banner only shows while the user hasn't acted — clear the
`cookieyes-consent` cookie and reload during testing.

**I get a `"use client"` or hydration-mismatch error.**
Both the `initCookieYes(...)` call and the components must be in a `"use client"` file. On
Next.js App Router, use [`@cookieyes/nextjs`](https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs)
(pre-marked `"use client"`). The SSR banner carries your configured `regulation` so server and
client render the same markup — passing different regulations between renders causes a mismatch.

**My consent choice doesn't persist.**
Consent is stored in the `cookieyes-consent` cookie (`SameSite=Lax`, `path=/`). Check it isn't
blocked by a browser privacy setting or extension, and that you aren't calling `resetCookieYes()`
on every render.

Still stuck? [Open an issue](https://github.com/cookieyes/cookieyes/issues).

## Community & support

- [Open an issue](https://github.com/cookieyes/cookieyes/issues) — bug reports and feature requests.
- Email — [support@cookieyes.com](mailto:support@cookieyes.com).
- [Full documentation](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md) — configuration, migration, examples.

_(A community chat channel is on the roadmap.)_

## Contributing

Contributions are welcome. Read our
[Contributing Guidelines](https://github.com/cookieyes/cookieyes/blob/main/CONTRIBUTING.md) and
[Code of Conduct](https://github.com/cookieyes/cookieyes/blob/main/CODE_OF_CONDUCT.md), then fork
the repo, create a feature branch, and open a pull request.

### Security

If you believe you've found a security vulnerability, **please do not open a public issue**.
Follow our [Security Policy](https://github.com/cookieyes/cookieyes/blob/main/SECURITY.md) and use
GitHub's private vulnerability reporting.

## License

MIT — see [LICENSE](./LICENSE). The "Powered by CookieYes" attribution in the banner may not be
removed on the free tier.
