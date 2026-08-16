<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-dark.svg">
    <img src="https://raw.githubusercontent.com/cookieyes/cookieyes/main/.github/assets/banner-light.svg" alt="CookieYes consent banner rendered in a Next.js app" width="820">
  </picture>
</p>

<h1 align="center">@cookieyes/nextjs</h1>

<p align="center"><strong>Cookie consent for Next.js — App Router and Pages Router, SSR-safe.</strong></p>

<p align="center">The full <code>@cookieyes/react</code> surface, pre-marked <code>"use client"</code> so it composes cleanly with Server Components.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cookieyes/nextjs"><img src="https://img.shields.io/npm/v/@cookieyes/nextjs" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cookieyes/nextjs"><img src="https://img.shields.io/npm/dw/@cookieyes/nextjs" alt="npm downloads"></a>
  <a href="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml"><img src="https://github.com/cookieyes/cookieyes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cookieyes/nextjs" alt="license"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#pages-router">Pages Router</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md">Docs</a>
</p>

---

> **Free-tier note:** the "Powered by CookieYes" attribution in the banner may not be removed
> on the free tier. Paid plans remove it.

---

## Key features

- **App Router & Pages Router** — one component works in both.
- **SSR-safe** — the banner is server-rendered into the first paint with no hydration mismatch.
- **GDPR & CCPA** — opt-in and "Do Not Sell" opt-out flows.
- **1:1 with `@cookieyes/react`** — every component, hook, and primitive, re-exported.

## Prerequisites

- **Node.js** ≥ 20
- **Next.js** ≥ 14 (App Router or Pages Router)
- **React** ≥ 18 and **React DOM** ≥ 18 (peer dependencies)

## Quick start

**1. Install the package**

```bash
npm install @cookieyes/nextjs
pnpm add @cookieyes/nextjs
yarn add @cookieyes/nextjs
bun add @cookieyes/nextjs
```

**2. Create a client consent-manager component**

Because `initCookieYes()` and the components are client-side, this file **must** start with
`"use client"`.

> **Which API should I read consent with?** This package re-exports
> `@cookieyes/react` verbatim, so the same guidance applies: **`useConsent()`**
> in client components, and for Server Components or route handlers (no React
> hooks available), read the raw cookie with `parseCookie` from
> `@cookieyes/core`. See the [shared decision tree](../../docs/which-api-should-i-use.md)
> and [`@cookieyes/react`'s Hooks section](../react/README.md#hooks) for the
> full low-level surface.

```tsx
// components/consent-manager.tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  initCookieYes,
} from "@cookieyes/nextjs";
import "@cookieyes/react/styles.css";

initCookieYes({
  mode: "cookie-only",    // "cookie-only" | "self-hosted"
  regulation: "GDPR",     // "GDPR" | "CCPA" | "DEFAULT"
  colorScheme: "system",  // "light" | "dark" | "system"
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

The `@cookieyes/react/styles.css` import is required — the components ship
no inline styling, so without it they render unstyled. It's exposed from
`@cookieyes/react` (a dependency of this package) rather than duplicated
under `@cookieyes/nextjs`.

**3. Mount it in your root layout** — the layout itself stays a Server Component:

```tsx
// app/layout.tsx
import { CookieYesRoot } from "@/components/consent-manager";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CookieYesRoot />
        {children}
      </body>
    </html>
  );
}
```

**4. Done.** The banner appears on first load. If it doesn't, see [Troubleshooting](#troubleshooting).

> Prefer zero manual setup? Run `npx @cookieyes/cli init` — it detects Next.js (App or Pages
> Router) and wires this up for you.

## Pages Router

The same `CookieYesRoot` component works in the Pages Router — render it in `pages/_app.tsx`:

```tsx
import type { AppProps } from "next/app";
import { CookieYesRoot } from "@/components/consent-manager";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <CookieYesRoot />
    </>
  );
}
```

## CCPA

For `regulation: "CCPA"`, also render the opt-out dialog:

```tsx
import { CookieBanner, CookiePreferences, CookieOptOut, RecallButton } from "@cookieyes/nextjs";

// inside CookieYesRoot:
<>
  <CookieBanner />
  <CookiePreferences />
  <CookieOptOut />
  <RecallButton />
</>
```

## Region-based regulation (server-detected)

Pick the banner's regulation from the visitor's region. On the server you read the location
header your host adds (Cloudflare/Vercel) with `regionFromHeaders`, pass it to your client
component, and wrap the banner in `<CookieYesProvider>` — so the **correct banner is
server-rendered for each visitor**, on the first paint, with no post-hydration flicker.

```tsx
// app/layout.tsx — a Server Component
import { headers } from "next/headers";
import { regionFromHeaders } from "@cookieyes/nextjs";
import { CookieYesRoot } from "./cookieyes-root"; // your "use client" module

export default async function RootLayout({ children }) {
  const region = regionFromHeaders(await headers()); // "US-CA" | "DE" | undefined
  return (
    <html>
      <body>
        <CookieYesRoot region={region} />
        {children}
      </body>
    </html>
  );
}
```

```tsx
// cookieyes-root.tsx — "use client"
"use client";
import { initCookieYes, CookieYesProvider, CookieBanner, CookieOptOut } from "@cookieyes/nextjs";

const map = { "US-CA": "CCPA", DE: "GDPR" } as const;

export function CookieYesRoot({ region }: { region?: string }) {
  const regionConfig = { detect: () => region, map };
  initCookieYes({ mode: "cookie-only", region: regionConfig });
  return (
    <CookieYesProvider region={regionConfig}>
      <CookieBanner />
      <CookieOptOut /> {/* render this too if any region maps to CCPA */}
    </CookieYesProvider>
  );
}
```

- **What it reads:** by default the well-known Vercel (`x-vercel-ip-country` + `-region`) and
  Cloudflare (`cf-ipcountry`) headers. Pass `regionFromHeaders(h, { header: "x-your-header" })`
  to read a custom one.
- `headers()` is `await`ed on Next.js 15+ and synchronous on 14 — use whichever your version needs.
- **First paint:** with the provider, the server resolves the region per request and renders the
  right banner directly into the HTML — a US visitor gets CCPA, an EU visitor gets GDPR, on the
  first byte. The provider resolves the same value on the client, so there's no hydration mismatch.
  (Without the provider, the banner still works but is corrected after hydration rather than
  server-rendered per request.)
- **GPC:** on a CCPA banner, the browser's "do not sell" signal (`navigator.globalPrivacyControl`)
  starts the visitor **opted out** — non-required categories denied, so gated scripts/iframes never
  load — until they choose otherwise. It's read in the browser (the server can't see it), so it
  applies right after hydration; it never changes *which* banner shows. Set `region.honorGpc: false`
  to ignore it.

## Returning visitors — no banner flash

By default the server doesn't know whether a visitor has already chosen, so it renders the
banner for everyone and the client removes it after hydration. A returning visitor **sees the
banner appear and then vanish**, which reads as a bug rather than as a remembered choice.

Read their decision from the request and pass it to the provider, and the banner is never in
their HTML at all — nothing to hide, so nothing flashes:

```tsx
// app/layout.tsx — a Server Component
import { CookieYesProvider } from "@cookieyes/nextjs";
import { getServerConsent } from "@cookieyes/nextjs/server";
import { CookieYesRoot } from "./cookieyes-root";

export default async function RootLayout({ children }) {
  const initialConsent = await getServerConsent({ regulation: "GDPR" });
  return (
    <html lang="en">
      <body>
        <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
          <CookieYesRoot />
        </CookieYesProvider>
        {children}
      </body>
    </html>
  );
}
```

- **Import from `@cookieyes/nextjs/server`,** not the main entry. It reads `next/headers` and is
  server-only; the main entry is `"use client"`.
- **Returns `null` when the banner should show** — a first-time visitor, a cookie recording no
  choice yet, a corrupt cookie, or one written against a different category taxonomy (which the
  client re-requests too). Passing `null` renders exactly as before, so this is safe to add
  everywhere.
- **`initialConsent` is a provider prop, never an `initCookieYes` option.** The consent runtime is
  a module-level singleton shared across concurrent requests, so per-visitor state there would leak
  between visitors — the same reason `region`/`regulation` go through the provider.
- Combine it with `region` from the section above; both are per-request and both belong on the
  provider.
- `getServerConsent()` calls `cookies()`, which opts the route into **dynamic rendering**, as any
  `cookies()` call does. On a statically rendered route there's no request to read, so the banner
  is server-rendered for everyone and hidden on the client as before.
- Framework-agnostic alternative: `readServerConsent(cookieHeader, options)` from
  `@cookieyes/core` takes the raw `Cookie` header, for Pages Router `getServerSideProps`,
  middleware, or any other SSR setup.

## Google Consent Mode (GA4, Ads, GTM)

Google tags need a Consent Mode **deny-by-default** set before any tag runs and
before the SDK boots — so a returning visitor's saved choice applies from first
paint. Render `<GoogleConsentMode />` high in your root layout:

```tsx
// app/layout.tsx
import { CookieYesProvider } from "@cookieyes/nextjs";
import { GoogleConsentMode } from "@cookieyes/nextjs/server";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GoogleConsentMode />
        <CookieYesProvider regulation="GDPR">{children}</CookieYesProvider>
      </body>
    </html>
  );
}
```

Then load the tags on the client with a preset from
[`@cookieyes/scripts`](https://github.com/cookieyes/cookieyes/tree/main/sdk/scripts)
— `ga4()`, `googleAds()`, or `googleTagManager()`. The SDK broadcasts each
consent change to Google as a Consent Mode `update`; you don't wire that up.

## API

This package re-exports the entire `@cookieyes/react` surface — the setup function
(`initCookieYes`), components (`CookieBanner`, `CookiePreferences`, `CookieOptOut`,
`RecallButton`, `GatedScript`, `GatedFrame`), headless primitives (`Banner`, `Preferences`,
`OptOut`), and all hooks (`useConsent`, `useConsentActions`, …).

It also adds **server-only** exports on their own subpath, kept out of the `"use client"` barrel:

| Import | Export | Purpose |
|---|---|---|
| `@cookieyes/nextjs/server` | `getServerConsent(options?)` | Reads the request's cookies and returns a returning visitor's stored decision (or `null`), for `<CookieYesProvider initialConsent>` |
| `@cookieyes/nextjs/server` | `<GoogleConsentMode />` | Renders the Google Consent Mode deny-by-default into the page `<head>` (see below) |

- Full option reference: **[Configuration](https://github.com/cookieyes/cookieyes/blob/main/docs/configuration.md)**.
- Component/hook reference: the **[`@cookieyes/react` README](https://github.com/cookieyes/cookieyes/tree/main/sdk/react#readme)**.

## Troubleshooting

**The banner doesn't appear.**
Ensure `<CookieYesRoot />` is mounted in your root `layout.tsx` (App Router) or `_app.tsx`
(Pages Router), and that `initCookieYes(...)` runs in the `"use client"` consent-manager module.
The banner only shows while the user hasn't acted — clear the `cookieyes-consent` cookie and
reload while testing.

**I get a `"use client"` error.**
The consent-manager file (the one calling `initCookieYes` and importing the components) must
start with `"use client"`. Keep your `layout.tsx` a Server Component and import
`<CookieYesRoot />` into it — don't add `"use client"` to the layout itself.

**Hydration mismatch on load.**
Use `@cookieyes/nextjs` (not `@cookieyes/react`) so the banner is pre-marked `"use client"`.
The server-rendered banner carries your configured `regulation`, so keep that value stable —
rendering with a different regulation on the client than on the server causes a mismatch.

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

MIT — see [LICENSE](./LICENSE). The "Powered by CookieYes" attribution may not be removed on the
free tier.
