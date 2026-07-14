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
import "@cookieyes/react/styles.css";

createCookieYes()
  .mode("cookie-only")    // "cookie-only" | "self-hosted"
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

The `@cookieyes/react/styles.css` import is required — the banner and
dialogs ship no inline styling, so without it they render unstyled. Import
it once per app, wherever your bundler picks up CSS imports.

## The builder — `createCookieYes()`

Chain configuration methods and finish with `.mount()`. `.mode()` is required;
`self-hosted` additionally requires `.backend()` or `.backendURL()`.

| Method | Purpose |
|--------|---------|
| `.mode("cookie-only" \| "self-hosted")` | **Required.** Cookie-only vs. synced to your backend. See [Deprecated](#deprecated-mode-offline) for the retired `"offline"` name. |
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

### Deprecated: `mode: "offline"`

`"offline"` was renamed to `"cookie-only"` — same behavior, clearer name. It
still works today and logs a one-time console warning, and will be removed
3 releases from now.

```diff
 createCookieYes()
-  .mode("offline")
+  .mode("cookie-only")
   .mount();
```

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
layout (no CLS), and it issues **no network request on load** (cookie-only mode
makes zero requests; self-hosted mode only POSTs to your backend when the user
accepts, rejects, or saves).

The following selectors are a **stable, public contract** — automated tooling and
your own integrations may rely on them, and they will not change without a
major-version bump and a regression test:

| Selector | Element |
|----------|---------|
| `[data-cky-banner]` | **Canonical** banner element — the visible card. Carries `role="dialog"`. |
| `.cy-banner` | The visible banner card (same element as above). Its bounding box equals what the user sees. |
| `.cy-banner-wrap` | A logical grouping wrapper rendered with `display: contents` — it generates **no box** and is never the measured element. |

## Accessibility

**Scope of this section:** keyboard operability, focus management, screen-reader
labelling, and reduced motion for `<CookieBanner />`, `<CookiePreferences />`,
`<CookieOptOut />`, and `<RecallButton />`. This is **not** a "WCAG 2.1 AA
compliant" claim — things outside this scope (color contrast, text resizing,
and anything in your own custom theme/content) aren't covered and shouldn't be
assumed to be.

### Keyboard behavior

If you're building a custom UI on the headless primitives (`Banner`,
`Preferences`, `OptOut`), this is the behavior to preserve:

- **Tab order** follows DOM order in every preset — e.g. Preferences goes
  Close → category toggles → Reject All → Save → Accept All → branding link.
  The banner is **not modal**, so Tab can leave it into the rest of your page;
  `<CookiePreferences />` and `<CookieOptOut />` **are** modal and trap focus.
- **`Esc`** closes `<CookiePreferences />` and `<CookieOptOut />`.
- **Focus trap**: while a dialog is open, `Tab` / `Shift+Tab` cycle only
  through its own controls.
- **Focus management on open/close**: opening a dialog moves focus into it
  (onto the dialog element itself, which carries its `aria-label`); closing it
  — via Save, Cancel, or `Esc` — returns focus to whatever control opened it.
- **Visible focus indicator**: every interactive control has a `:focus-visible`
  outline; none of this relies on the browser's default styling.

### Reduced motion

All entrance/exit animations (banner slide-in, dialog fade/slide, the recall
button's pop-in) are removed under `prefers-reduced-motion: reduce` — every
element still appears and works identically, just without motion.

### Automated testing

`axe-core` runs against `<CookieBanner />`, `<CookiePreferences />`, and
`<CookieOptOut />` in CI (`src/__tests__/a11y.test.tsx`) and fails the build on
any violation. **Caveat:** this runs under jsdom, not a real browser — it
catches structural/ARIA regressions (missing accessible names, wrong roles,
broken labelling) but can't evaluate layout- or paint-dependent rules like
color contrast. It's a regression net, not a substitute for manual testing.

### Manual testing

Keyboard and focus-management behavior above was verified by hand across
desktop/tablet/mobile viewports and light/dark color schemes, and the
labelling behavior was verified with VoiceOver. If you find something that
doesn't sound right with your own screen reader, please open an issue.

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
  .mode("cookie-only")
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

## Content Security Policy

The banner, dialogs, and theme colors all work under a strict `style-src`
policy with no `unsafe-inline` and no nonce — nothing here writes CSS text
into the page.

- Layout, animations, and everything else in `cookieyes.css` ship as a real
  stylesheet (`import "@cookieyes/react/styles.css"`), loaded via a `<link>`,
  not a `<style>` block — `style-src` doesn't restrict where a real
  stylesheet is fetched from as long as it's same-origin (which it is, once
  bundled by your own build).
- `.theme(...)` colors are applied with `element.style.setProperty(...)` —
  direct CSSOM writes, not a generated `<style>` block — which `style-src`
  doesn't govern at all, under any policy.

A minimal policy line that works out of the box, with no CookieYes-specific
allowance needed:

```
Content-Security-Policy: style-src 'self'
```

If something unrelated to CookieYes still gets blocked (your own inline
styles, a third-party script), the SDK listens for the browser's
`securitypolicyviolation` event and logs a console warning explaining what
was blocked, rather than failing silently.

## License

MIT — see [LICENSE](./LICENSE). The "Powered by CookieYes" attribution in the banner may not be removed on the free tier.
