---
name: install-consent-banner
description: "Add the CookieYes consent banner to a Next.js, React or plain JavaScript site with the open-source @cookieyes packages: install, initialise, render, verify."
---

# Install the CookieYes consent banner

Use this when someone wants a cookie consent banner in a Next.js, React or plain JavaScript project, without a hosted service or an account. The packages are open source (MIT), run in the frontend and store the visitor's choice in a cookie. Full docs: https://developers.cookieyes.com/docs/nextjs (switch the framework in the sidebar).

## Decide two things first

1. **Regulation**: `"GDPR"` (opt-in, most sites) or `"CCPA"` (California-style opt-out). It applies to every visitor, so pick the strictest law your visitors fall under. To choose per visitor by country, set the `region` option instead (see the configuration docs); a manual `regulation` always wins over `region`. Under `"CCPA"` in React or Next.js, also render `<CookieOptOut />` next to `<CookieBanner />`: the Do Not Sell button opens it.
2. **Mode**: `"cookie-only"` (default, no backend) or `"self-hosted"` with an `apiUrl`, only if a server-side record of each consent is required.

## Fastest path: the CLI

In an existing Next.js or React project, run:

```bash
npx @cookieyes/cli init
```

It detects the framework, asks for backend mode, regulation, colour scheme and extra languages, installs the package and writes `components/consent-manager/provider.tsx` and `index.tsx`, then adds `<CookieYesRoot />` to the layout or entry file. If it prints "Manual step needed", paste the printed lines where it says.

## Manual setup

### Next.js

```bash
npm install @cookieyes/nextjs
```

```tsx title="app/consent-manager.tsx"
"use client";

import { CookieBanner, CookiePreferences, RecallButton, initCookieYes } from "@cookieyes/nextjs";
import "@cookieyes/nextjs/styles.css";

initCookieYes({
  mode: "cookie-only",
  regulation: "GDPR",
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

```tsx title="app/layout.tsx"
import { CookieYesRoot } from "./consent-manager";

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

The consent file must start with `"use client"`. The layout stays a Server Component.

### React (Vite, Create React App, Remix or any other setup)

```bash
npm install @cookieyes/react
```

Same `consent-manager.tsx` as above without the `"use client"` line, importing from `@cookieyes/react` and `@cookieyes/react/styles.css`. Render `<CookieYesRoot />` once, before the page content, for example in `src/main.tsx`.

### Plain JavaScript, Vue, Svelte, Angular

```bash
npm install @cookieyes/core
```

```ts title="src/consent.ts"
import { initCookieYes } from "@cookieyes/core";

export const { consentStore, consentManager } = initCookieYes({
  mode: "cookie-only",
  regulation: "GDPR",
});
```

`@cookieyes/core` draws no UI. Render the banner from `consentStore` and call `consentManager` from its buttons: https://developers.cookieyes.com/docs/core/store/build-your-own-ui

## Verify

1. Load the site: the banner appears at the bottom.
2. Click **Accept All**, reload: the banner stays away and a small round button reopens the preferences.
3. To test again, delete the `cookieyes-consent` cookie.

## Common mistakes

- **Banner renders as plain text**: the `styles.css` import is missing.
- **Nothing renders and no error**: `<CookieYesRoot />` is not rendered anywhere, so `initCookieYes()` never ran.
- **"You're importing a component that needs use client"** (Next.js): the consent file lost its `"use client"` line, or `initCookieYes()` was called in the layout.
- **Set `regulation` to `"GDPR"` or `"CCPA"`**, or leave it out to behave as GDPR.
- **`tsc` reports TS2882 for the `styles.css` import** in a fresh Next.js checkout: run `next dev` or `next build` once. It creates `next-env.d.ts`, which loads the Next.js types that declare CSS imports.

## Next

- Every option: https://developers.cookieyes.com/docs/nextjs/getting-started/configuration
- Load analytics and ads only after consent: use the `gate-third-party-scripts` skill on this host.
- Unit-test code that depends on consent: use the `test-consent` skill on this host.
