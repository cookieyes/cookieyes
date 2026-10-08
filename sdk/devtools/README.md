<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes Consent SDK" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/devtools</h1>

An in-page debugging panel for the CookieYes consent SDK — see live what the SDK believes and does,
test other regions locally without a VPN, and be provably absent from your production bundle.

**React / Next.js only** in this first version (a core-only/vanilla-JS panel is a follow-up).

## Install

```bash
npm install --save-dev @cookieyes/devtools
```

It's a `devDependency`: the whole point is that it costs your production bundle nothing (see
"How the exclusion works" below).

## Usage

Mount `<CookieYesDevtools />` once, anywhere under your app (it renders into a fixed-position
overlay, so placement in the tree doesn't matter):

```tsx
"use client";
import { CookieYesDevtools } from "@cookieyes/devtools";
import "@cookieyes/devtools/styles.css";

export function DevtoolsRoot() {
  return <CookieYesDevtools position="bottom-right" />;
}
```

- **Toggle:** click the floating CookieYes logo button, or press `Ctrl/Cmd+Shift+Y`. `Escape` closes it.
  Drag the button to another corner to move it (it snaps and remembers).
- **Position:** `"top-left" | "top-right" | "bottom-left" | "bottom-right"` (default `"bottom-right"`).
- **Theme:** `"light" | "dark" | "system"` (default `"system"`): the host page's scheme, so the
  panel can match it. The System / Light / Dark switch in the panel header overrides it (saved in
  `localStorage["cyd:theme"]`); choosing System there follows this prop again.

There is deliberately no other opt-in — mounting the component *is* the opt-in (Story 1.4).

## What it shows

- **Consent** — working (unsaved) vs committed values, side by side; toggle categories, then
  Save / Accept all / Reject all; copy-as-JSON.
- **Integrations** — every configured integration's live status, a per-status summary and a filter.
- **Blocked** — requests the network blocker stopped (capped at 200, oldest evicted first).
- **Google Consent Mode** — the current 7 signals, plus a history of every push (including the
  pre-hydration server default, reconstructed once from `window.dataLayer`).
- **Events** — an interleaved timeline of consent saves, integration status changes and blocked
  requests (capped at 200): kind filters, search, a JSON payload per row, export and clear. The
  last 100 are kept in `sessionStorage["cyd:events"]`, so they survive a reload in the same tab.
- **Locale** — the resolved region/regulation and how it was reached, plus a `forceRegion` override
  to test any region locally: a searchable picker of every country and US state, grouped with the
  regions in your `region.map` first, each tagged with the regulation it would resolve to, and
  one-click presets. An active override shows a persistent "this would differ in production"
  banner and is impossible to enable in production (see below). A language picker switches the
  banner live through the runtime's own `setLanguage`, listing the languages your config loads and
  the ones `@cookieyes/translations` ships, and says so when a language has no translations.
- **Scanner** — everything third-party on the page, live: scripts, iframes, requests, cookies and
  localStorage keys. Each is matched against what the SDK manages and a built-in table of common
  vendors, so you see what's managed, what isn't and which category it probably needs. Anything
  that appeared before its category was granted (or a vendor cookie still set after withdrawal)
  is flagged at the top, and each unmanaged row has the `@cookieyes/scripts` preset,
  `customScript`, `<GatedFrame>` or network-blocker rule that would gate it, ready to copy.
  Dismissals persist; results export as JSON.
- **Actions** — open preferences / opt-out, copy the full state, download a debug bundle, reset
  consent.

## How the exclusion works

Production exclusion is via **package.json conditional exports**, not a runtime flag:

```json
{
  "exports": {
    ".": {
      "development": { "import": "./dist/index.js" },
      "import": "./dist/stub.js"
    }
  }
}
```

A dev server (`next dev`, Vite dev) sets the `development` condition, so the real panel resolves.
A production build (`next build`, `vite build`) never sets it, so bundlers resolve `stub.js` instead
— a function that renders `null` and touches no React state, no `@cookieyes/core`, no
`@cookieyes/react`. `@cookieyes/devtools/styles.css` resolves the same way: the real stylesheet under
`development`, an empty file otherwise, so the import is safe to leave in production code. The real panel's entire module graph — its components, hooks and CSS import —
is never reached, never parsed, and contributes nothing to a production bundle.

This is the **only** exclusion mechanism. There is no `NODE_ENV`/`disabled`-prop fallback in the real
panel's entry, on purpose: a fallback that can run in production is a path a future change could
accidentally reactivate. `tools/size/fixtures/with-nextjs-devtools` is the proof — a real production
Next.js build with `<CookieYesDevtools />` mounted, measured by the same harness that gates every
other package's size, asserting the delta stays within a fixed byte ceiling and that no distinctive
string from the real panel appears in any emitted chunk.

## `forceRegion`

The region override is stored in a `__cyd_region` cookie (readable by a server helper, e.g.
`@cookieyes/nextjs`'s `getServerRegion()`) and mirrored to `localStorage`. It does not touch the
SDK's runtime singleton — writing it only updates storage. The client picks it up on the next
`initCookieYes`/`CookieYesProvider` render; a server-rendered banner needs a page reload to see it on
its next request. The panel discloses this asymmetry rather than hiding it.

## Language override

The chosen language is applied with the runtime's own `setLanguage` and kept in
`localStorage["cyd:language"]`, so it is re-applied after a reload until you press Reset (which
returns to the language your config picked). The SDK itself never reads that key: a reload shows
the configured language for a moment before the override is applied again.

## Peer dependencies

Requires `@cookieyes/core` and `@cookieyes/react` at or above the version this package's contract
first shipped in (see `package.json`'s `peerDependencies` — an open upper bound, so the contract can
grow without a lockstep bump).
