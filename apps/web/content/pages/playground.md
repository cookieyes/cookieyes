# Playground

> This is the Markdown form of https://developers.cookieyes.com/playground. The docs index for agents is at /llms.txt. Every page is also available as Markdown: send `Accept: text/markdown` to the page URL.

Try the CookieYes banner before you install it. Change the settings, use the banner the way a visitor would, then copy the setup.

## Banner sandbox

The sandbox runs the real `@cookieyes/react` package. Edits apply as you type. The starting file is the same one the installation guide creates:

```tsx
"use client";

import "@cookieyes/react/styles.css";
import { CookieBanner, CookiePreferences, RecallButton, initCookieYes } from "@cookieyes/react";

initCookieYes({
  mode: "cookie-only", // "cookie-only" | "self-hosted"
  regulation: "GDPR", // "GDPR" | "CCPA"
  colorScheme: "light", // "light" | "dark" | "system"
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

## Console

Use the banner and watch what your tags do. The console lists each script the SDK allowed or held back, with the consent category that decided it.

## Start with install

No account. No dashboard. Install the package and add consent directly to your site.

- Next.js: https://developers.cookieyes.com/docs/nextjs/getting-started/installation
- React: https://developers.cookieyes.com/docs/react/getting-started/installation
- JavaScript: https://developers.cookieyes.com/docs/core/getting-started/installation
