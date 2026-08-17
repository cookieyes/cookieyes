---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Returning visitors no longer see the banner flash before it disappears

The server had no way to know whether a visitor had already chosen, so it sent banner markup to
everyone and the client removed it after hydration. A returning visitor watched the banner appear
and then vanish, which reads as a bug rather than as a remembered choice.

Three additions let the server know:

**`readServerConsent(cookieHeader, options?)`** — new in `@cookieyes/core`. Reads a stored decision
from a request's `Cookie` header with no `document` and no browser APIs, so it works in any SSR
framework:

```ts
const initialConsent = readServerConsent(request.headers.get("cookie") ?? "", config);
```

**`<CookieYesProvider initialConsent={…}>`** — new prop in `@cookieyes/react`. Given a decision, the
banner is never rendered: absent from the HTML rather than present-then-removed, so there is nothing
to flash.

**`getServerConsent(options?)`** — new in `@cookieyes/nextjs`, from the `@cookieyes/nextjs/server`
subpath. Reads `cookies()` for you in the App Router:

```tsx
import { CookieYesProvider } from "@cookieyes/nextjs";
import { getServerConsent } from "@cookieyes/nextjs/server";

export default async function RootLayout({ children }) {
  const initialConsent = await getServerConsent({ regulation: "GDPR" });
  return (
    <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
      {children}
    </CookieYesProvider>
  );
}
```

It lives on a separate subpath because it imports `next/headers` and must stay server-only — the
main `@cookieyes/nextjs` entry is `"use client"`.

`readServerConsent` returns `null` — meaning "show the banner" — for a first-time visitor, a cookie
recording no choice yet, a corrupt cookie, or one written against a different category taxonomy. That
last rule mirrors the client's exactly, including the exception that honours a legacy cookie with no
taxonomy stamp on the built-in five categories, so an upgrade never re-prompts existing visitors. If
the two ever disagreed, the banner would flash again.

`initialConsent` is a provider prop rather than an `initCookieYes` option deliberately: the consent
runtime is a module-level singleton shared across concurrent server requests, so per-visitor state
stored there would leak between visitors. React context is per-request.

Purely additive — omitting `initialConsent` leaves rendering byte-for-byte as it was.
