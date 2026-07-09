# @cookieyes/react

React adapter for the CookieYes consent SDK. A small builder to configure the engine, drop-in banner/dialog components, and hooks for reading and changing consent in any React application.

## Install

```bash
npm install @cookieyes/react
pnpm add @cookieyes/react
yarn add @cookieyes/react
bun add @cookieyes/react
```

**Peer dependencies:** React ≥ 18, React DOM ≥ 18

## Which API should I use?

**`useConsent()` is the recommended way to read consent in React.** See the
[shared decision tree](../../docs/which-api-should-i-use.md) if you're not
sure which API applies to your situation — this package also exposes a
handful of lower-level hooks (see [Hooks](#hooks)) for specific edge cases.

## Quick start

Configure the runtime once with `createCookieYes()`, then render the preset
components. Both the configuration call and the components must live in a
`"use client"` module.

```tsx
// components/consent-manager.tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  createCookieYes,
} from "@cookieyes/react";

createCookieYes()
  .mode("offline")        // "offline" (cookie-only) | "self-hosted"
  .regulation("GDPR")     // "GDPR" | "CCPA"
  .colorScheme("system")  // "light" | "dark" | "system"
  .mount();

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

Render `<CookieYesRoot />` once, near the root of your app.

## The builder — `createCookieYes()`

Chain configuration methods and finish with `.mount()`. `.mode()` is required;
`self-hosted` additionally requires `.backend()` or `.backendURL()`.

| Method | Purpose |
|--------|---------|
| `.mode("offline" \| "self-hosted")` | **Required.** Cookie-only vs. synced to your backend. |
| `.regulation("GDPR" \| "CCPA" \| "DEFAULT")` | Which regulation applies. |
| `.colorScheme("light" \| "dark" \| "system")` | Theme mode. |
| `.theme(themeConfig)` | Color / radius / font tokens. |
| `.i18n({ messages })` | Provide locale translation maps. |
| `.backend(adapter)` / `.backendURL(url)` | Self-hosted persistence. |
| `.apiKey(key)` | Optional auth key. |
| `.blockNetwork(config)` | Block network requests until consent. |
| `.reloadOnRevoke(true)` | Reload the page when consent is revoked. |
| `.onConsentReady(fn)` / `.onConsentUpdate(fn)` | Low-level lifecycle callbacks — see [Hooks](#hooks). |
| `.mount()` | Build and register the runtime. |

## Components

### Presets (styled, drop-in)

- **`<CookieBanner />`** — the consent banner. Shows automatically until the user acts; renders the CCPA "Do Not Sell" variant when `regulation` is `"CCPA"`.
- **`<CookiePreferences />`** — the per-category preferences dialog (opened from the banner or via `showPreferences()`).
- **`<CookieOptOut />`** — the CCPA opt-out dialog. Include this when using `regulation("CCPA")`.

### Controls

- **`<RecallButton />`** — floating button to reopen preferences (or the opt-out dialog under CCPA) after the user has acted.
- **`<GatedScript />`** — registers a third-party script that only loads once its category is consented:

  ```tsx
  <GatedScript
    id="gtm"
    src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"
    category="analytics"
    strategy="afterConsent" // "afterConsent" | "lazyOnce"
  />
  ```

- **`<GatedFrame />`** — blocks an iframe until its category is granted, showing a placeholder otherwise:

  ```tsx
  <GatedFrame
    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    category="analytics"
    width={560}
    height={315}
    placeholder={<div>Enable analytics cookies to watch this video.</div>}
  />
  ```

### Headless primitives

For fully custom UIs, compose the slot namespaces `Banner`, `Preferences`, and
`OptOut` (e.g. `Banner.Root`, `Banner.AcceptAll`, `Preferences.Category`). The
presets above are built from exactly these primitives.

## Rendering & selector contract

`<CookieBanner />` is **server-rendered**: its markup is present in the initial
HTML (first-byte paint) and on every load, before client JavaScript hydrates the
interactive parts. It uses fixed positioning, so showing it never shifts page
layout (no CLS), and it issues **no network request on load** (offline mode makes
zero requests; self-hosted mode only POSTs to your backend when the user accepts,
rejects, or saves).

The following selectors are a **stable, public contract** — automated tooling and
your own integrations may rely on them, and they will not change without a
major-version bump and a regression test:

| Selector | Element |
|----------|---------|
| `[data-cky-banner]` | **Canonical** banner element — the visible card. Carries `role="dialog"`. |
| `.cy-banner` | The visible banner card (same element as above). Its bounding box equals what the user sees. |
| `.cy-banner-wrap` | A logical grouping wrapper rendered with `display: contents` — it generates **no box** and is never the measured element. |

## Hooks

**Read consent state:**

```tsx
const snapshot = useConsent();
// { consentId, hasActed, categories, regulation, lastRenewed, isPreferencesOpen, isOptOutOpen }
```

**Drive consent (accept/reject/save, open or close dialogs):**

```tsx
const {
  acceptAll, rejectAll, acceptSelected, save, updateCategory, reset,
  showPreferences, hidePreferences, showOptOut, hideOptOut,
} = useConsentActions();
```

**Other hooks** (each reads something `useConsent()` doesn't cover, so these
aren't alternatives to it):

```tsx
const regulation = useRegulation();          // "GDPR" | "CCPA" | "DEFAULT"
const t = useTranslations();                 // active TranslationMap
const bannerVisible = useBannerVisibility();  // boolean
const prefsOpen = usePreferencesOpen();       // boolean
const optOutOpen = useOptOutOpen();           // boolean
```

### Low-level hooks

You shouldn't need these for a typical integration — each exists for a
narrower situation than `useConsent()` / `useConsentActions()`:

| Hook / callback | Use when |
|---|---|
| `useConsentCategory(category)` | You're gating one thing (e.g. an embed) and want to re-render only when *that* category changes, not on every consent update. |
| `useConsentRuntime()` | You need direct access to the underlying runtime (manager, snapshot getters, script registration) — something neither `useConsent()` nor `useConsentActions()` exposes. |
| `getCookieYes()` | You need imperative, non-hook access outside a component (event handlers, non-component modules). |
| `.onConsentReady(fn)` (builder) | A one-time callback right after the initial state is known, rather than an ongoing subscription. |
| `.onConsentUpdate(fn)` (builder) | Fires on every *saved* change only (not transient toggles), registered once at config time. For a dynamic subscribe/unsubscribe instead, use `useConsentRuntime().manager.subscribe` or core's `consentStore.getState().subscribeToConsentChanges`. |

## Theming

Pass a `theme` to the builder. All values map to CSS custom properties, so you
can also override them in your own stylesheet:

```tsx
createCookieYes()
  .mode("offline")
  .theme({
    primaryColor: "#6366F1",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    mutedTextColor: "#6B7280",
    borderColor: "#E5E7EB",
    borderRadius: "8px",
    fontFamily: "'Inter', sans-serif",
    buttonVariant: "filled",        // "filled" | "outlined"
    widgetPosition: "bottom-right", // "bottom-right" | "bottom-left"
  })
  .mount();
```

## License

MIT — see [LICENSE](./LICENSE). The "Powered by CookieYes" attribution in the banner may not be removed on the free tier.
