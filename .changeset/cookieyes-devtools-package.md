---
"@cookieyes/devtools": minor
---

New package: `@cookieyes/devtools` — an in-page debugging panel for the CookieYes SDK.

Mount `<CookieYesDevtools />` (React/Next.js) to see, live, what the SDK believes and does:
consent state (working vs committed), integration status, blocked network requests, Google
Consent Mode signals and history, an interleaved event stream, and the resolved
region/regulation decision — including a `forceRegion` override to test any region locally
without a VPN, with a persistent warning while an override is active.

Ships as its own package and is provably absent from a production bundle: `package.json`
conditional exports resolve a real panel only when a bundler sets the `development` condition
(a dev server); a production build (`next build`, `vite build`) resolves a stub that renders
`null` and touches nothing. `tools/size`'s size gate proves this by measurement — a real
production Next.js build with the panel mounted, checked for both a byte-ceiling on the delta
and the absence of the real panel's code from every emitted chunk — not by intent.

```tsx
import { CookieYesDevtools } from "@cookieyes/devtools";
import "@cookieyes/devtools/styles.css";

<CookieYesDevtools position="bottom-right" />;
```

See the package README and the "Devtools" docs page for the full tab-by-tab guide.
