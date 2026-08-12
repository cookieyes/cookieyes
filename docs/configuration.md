# Configuring the CookieYes SDK

This is the **single source of truth** for configuring the SDK. Every package —
`@cookieyes/core`, `@cookieyes/react`, and `@cookieyes/nextjs` — accepts the
**exact same** configuration object, so a config is copy-pasteable between them
with zero edits.

The one setup function is **`initCookieYes(config)`**.

> Migrating from the `createCookieYes()` builder chain? See the
> [builder → config migration guide](./migration/builder-to-config.md).

---

## Quick start

### React / Next.js

Call `initCookieYes` once in a `"use client"` module, then render the presets.

```tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  initCookieYes,
} from "@cookieyes/react"; // or "@cookieyes/nextjs"

initCookieYes({
  mode: "offline",       // "offline" (cookie-only) | "self-hosted"
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

After a single `initCookieYes` call, `<CookieBanner />`, `<CookiePreferences />`
and every hook (`useConsent()` etc.) wire up automatically against the
registered runtime — no further setup.

### Core (framework-agnostic)

```ts
import { initCookieYes } from "@cookieyes/core";

const { consentManager, consentStore } = initCookieYes({
  mode: "offline",
  regulation: "GDPR",
  colorScheme: "system",
});
```

`initCookieYes` in core is an alias of `getOrCreateConsentRuntime` — same
process-wide singleton, same return value.

---

## The `CookieYesConfig` object

The config is a **flat** object discriminated on `mode`. Backend-only keys are a
type error under `mode: "offline"`.

| Key | Type | Applies to | Notes |
|-----|------|-----------|-------|
| `mode` | `"offline" \| "self-hosted"` | both | **Required.** Cookie-only vs. synced to your backend. |
| `regulation` | `"GDPR" \| "CCPA" \| "DEFAULT"` | both | Which privacy regulation applies. Top-level and identical everywhere. |
| `colorScheme` | `"light" \| "dark" \| "system"` | both | Theme mode. |
| `theme` | `ThemeConfig` | both | Color / radius / font tokens (see below). |
| `i18n` | `I18nConfig` | both | Translation messages / locale. |
| `consentCategories` | `ConsentCategory[]` | both | Restrict the categories shown. |
| `networkBlocker` | `NetworkBlockerConfig` | both | Block third-party requests by category until consent. |
| `reloadOnRevoke` | `boolean` | both | Reload the page when consent is revoked. |
| `onConsentReady` | `(state) => void` | both | Fires once the initial consent state is resolved. |
| `onConsentUpdate` | `(state) => void` | both | Fires on every saved consent change. |
| `apiUrl` | `string` | self-hosted | Endpoint the consent payload is POSTed to. |
| `apiKey` | `string` | self-hosted | Optional bearer key sent as `Authorization`. |
| `backend` | `ConsentBackend` | self-hosted | Custom `persist(payload)` adapter — full control over transport. |

### Modes

- **`offline`** — consent lives only in the `cookieyes-consent` cookie. Zero
  network requests.
- **`self-hosted`** — every decision (Accept All / Reject All / Save
  Preferences) is POSTed to your own endpoint. Provide either `apiUrl` or a
  custom `backend` adapter.

```ts
// self-hosted with a plain endpoint
initCookieYes({
  mode: "self-hosted",
  apiUrl: "https://your-backend.example.com/v1/consent",
  regulation: "GDPR",
});

// self-hosted with a custom adapter (full control over transport/headers/retries)
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

The POST contract — payload shape, headers, and delivery semantics — is
described by the exported `ConsentPayload` type; see the `@cookieyes/core`
README for the request/response details.

### Theming

`theme` values map to CSS custom properties, so you can also override them in
your own stylesheet.

```ts
initCookieYes({
  mode: "offline",
  theme: {
    primaryColor: "#6366F1",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    mutedTextColor: "#6B7280",
    borderColor: "#E5E7EB",
    borderRadius: "8px",
    fontFamily: "'Inter', sans-serif",
    buttonVariant: "filled",        // "filled" | "outlined"
    widgetPosition: "bottom-right", // "bottom-right" | "bottom-left"
  },
});
```

Theme values are applied to the elements via the CSSOM, which beats the
stylesheet's own defaults — so a `theme` override always wins, and it keeps
working under a strict `style-src` CSP with no `unsafe-inline` or nonce.

---

## Server-side rendering: returning visitors

If you server-render, the server does not know whether a visitor has already
chosen — so by default it sends banner markup to everyone and the client removes
it after hydration. A returning visitor sees the banner appear and then vanish.

Read the decision from the request and pass it to the provider, and the banner is
never rendered for them at all:

```tsx
// Next.js App Router — app/layout.tsx
import { CookieYesProvider } from "@cookieyes/nextjs";
import { getServerConsent } from "@cookieyes/nextjs/server";

export default async function RootLayout({ children }) {
  const initialConsent = await getServerConsent({ regulation: "GDPR" });
  return (
    <html lang="en">
      <body>
        <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
          {children}
        </CookieYesProvider>
      </body>
    </html>
  );
}
```

Any other SSR framework — pass the request's `Cookie` header to core directly:

```ts
import { readServerConsent } from "@cookieyes/core";

const initialConsent = readServerConsent(request.headers.get("cookie") ?? "", {
  regulation: "GDPR",
});
```

`readServerConsent` returns `null` — "show the banner" — for a first-time visitor,
a cookie recording no choice yet, a corrupt cookie, or one written against a
different category taxonomy (which the client also re-requests). It touches no
browser API, so it is safe in any server runtime.

Two things to know:

- **`initialConsent` is a provider prop, never an `initCookieYes` option.** The
  consent runtime is a module-level singleton shared across concurrent server
  requests, so per-visitor state there would leak between visitors. The same
  applies to `region`/`regulation`, which is why the provider exists.
- `getServerConsent` reads `cookies()`, which opts the route into dynamic
  rendering as any `cookies()` call does. A statically rendered route has no
  request to read, so there the banner is server-rendered for everyone and hidden
  on the client as before.

---

## Stylesheets

| Import | Contents | When |
|---|---|---|
| `@cookieyes/react/styles.css` | Everything — banner, preferences dialog, opt-out, toggles, revisit widget, reload notice (~25 KB) | **Required.** Import once per app. |
| `@cookieyes/react/critical.css` | Only the rules needed to paint the banner (~1.6 KB gzipped) | Optional. Inline in `<head>` when you want to keep the full sheet off the critical path. |

The banner ships no inline styling, so `styles.css` is required — without it the
banner and dialogs render unstyled.

`critical.css` is an exact subset: every rule in it is byte-identical to the same
rule in `styles.css`, enforced by a test, so the two can never disagree about how
the banner looks. It exists for one case — inlining the banner's CSS in the
document head and deferring the rest — and is unnecessary if your bundler already
puts `styles.css` in the critical path, which an app-root `import` normally does.
It is a supplement, never a replacement: always load `styles.css` too, or the
preferences dialog will be unstyled when a visitor opens it.

---

## Reacting to consent changes

When you need your own code to run as a visitor grants or withdraws consent —
load a script after they accept analytics, sync a pixel, log the decision — use
the event API. It's the recommended way to react to consent; the older
subscribe/callback paths still work but aren't the primary path.

There are two events:

- **`change`** — fires only when a category's value actually differs. Use it to
  (re)load a script, so a visitor re-confirming the same choices doesn't run it
  again.
- **`save`** — fires on every save, even an unchanged re-confirm (e.g. a "your
  preferences were saved" toast).

Every listener also fires **once immediately** with the current state, marked
`isInitial: true` — so code that starts listening late still learns what the
visitor already chose, instead of missing it.

**React / Next.js** — `useOnConsentChange(type, listener, options?)`:

```tsx
"use client";
import { useOnConsentChange } from "@cookieyes/react"; // or "@cookieyes/nextjs"

function Analytics() {
  useOnConsentChange("change", ({ changedCategories, isInitial }) => {
    if (changedCategories.includes("analytics")) loadAnalytics();
  });
  return null;
}
```

Pass `{ category: "analytics" }` to only hear about one category. The hook cleans
up on unmount and is a no-op during server rendering.

**Core (framework-agnostic)** — `consentStore.on(type, listener, options?)`:

```ts
const { consentStore } = initCookieYes({ mode: "cookie-only" });

const off = consentStore.on("change", ({ changedCategories }) => {
  if (changedCategories.includes("analytics")) loadAnalytics();
});
// off() when you no longer need it.
```

The payload is `{ categories, changedCategories, isInitial }`: the full committed
map, the ids that differed (empty on the initial replay), and whether this is
that replay or a live action.

---

## Deprecated aliases

These older keys still work but are deprecated and will be **removed after three
release cycles**, per the SDK deprecation policy. Each maps silently to its
canonical key; if both are set, the canonical key wins and one warning is logged.

| Deprecated | Canonical | Notes |
|-----------|-----------|-------|
| `overrides.regulation` | `regulation` | Move `regulation` to the top level; drop the `overrides` wrapper. |
| `backendURL` | `apiUrl` | Rename the key. |
| `createCookieYes()` builder | `initCookieYes(config)` | See the [migration guide](./migration/builder-to-config.md). |
| `ConsentRuntimeOptions` (type) | `CookieYesConfig` | Type alias only. |
