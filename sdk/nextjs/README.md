# @cookieyes/nextjs

Next.js adapter for the CookieYes consent SDK. It re-exports the entire
`@cookieyes/react` surface, pre-marked with `"use client"` so it composes
cleanly with the App Router and Server Components.

## Install

```bash
npm install @cookieyes/nextjs
pnpm add @cookieyes/nextjs
yarn add @cookieyes/nextjs
bun add @cookieyes/nextjs
```

**Peer dependencies:** Next.js ≥ 14, React ≥ 18, React DOM ≥ 18

## Setup (App Router)

Create a client component that configures the runtime and renders the consent
UI. Because `createCookieYes()` and the components are client-side, this file
**must** start with `"use client"`.

```tsx
// components/consent-manager.tsx
"use client";

import {
  CookieBanner,
  CookiePreferences,
  RecallButton,
  createCookieYes,
} from "@cookieyes/nextjs";

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

Then mount it in your root layout — the layout itself stays a Server Component:

```tsx
// app/layout.tsx
import { CookieYesRoot } from "@/components/consent-manager";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieYesRoot />
      </body>
    </html>
  );
}
```

## Pages Router

The same `CookieYesRoot` component works in the Pages Router — render it in
`pages/_app.tsx` alongside your app:

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

For `regulation("CCPA")`, also render the opt-out dialog:

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

## API

This package re-exports everything from `@cookieyes/react` — the builder
(`createCookieYes`), components (`CookieBanner`, `CookiePreferences`,
`CookieOptOut`, `RecallButton`, `GatedScript`, `GatedFrame`), headless
primitives (`Banner`, `Preferences`, `OptOut`), and all hooks (`useConsent`,
`useConsentActions`, `useConsentCategory`, `useRegulation`, …). See the
[`@cookieyes/react` README](../react#readme) for the full reference.

## License

MIT — see [LICENSE](./LICENSE). The "Powered by CookieYes" attribution may not be removed on the free tier.
