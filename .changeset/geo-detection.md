---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Add optional region-based regulation (geo-detection).

- New `region` config: `detect` (return the visitor's region synchronously), `map` (region → regulation, you own it), `honorGpc` (default true), and `strictest` (default `GDPR`).
- Resolution rules: which banner shows is geo only — a detected region maps to your regulation; unknown/failed detection falls back to the strictest (a required banner is never skipped); a manual `regulation` always wins (with a dev warning).
- GPC: the browser's "do not sell" signal never changes which banner shows. On a CCPA banner it starts the visitor opted out — non-required categories denied, so gated scripts/iframes don't run — until they explicitly choose otherwise. Applied client-side; set `honorGpc: false` to ignore it.
- New `<CookieYesProvider region={…}>` (React/Next.js): supplies the regulation per request through context, so a Server Component tree renders the correct banner on the server for each visitor (no post-hydration correction). Optional and additive — without it, the hooks read the runtime as before. Pass the same `region` config you give `initCookieYes`.
- New `useRegion()` hook (React) and `consentStore.getRegion()` (core) expose the decision: `region`, `regulation`, `source` (`"manual" | "detected" | "strictest"`), `confidence`. `useRegion()`/`useRegulation()` read the provider when present. `useRegulation()` is unchanged in shape.
- `region.debug: true` logs the resolved decision to the console at setup — a quick check without writing component code.
- Self-hosted: the detected `region` is included on the consent-log payload.
- New `regionFromHeaders(headers, { header? })` reads the visitor's region from request headers on the server (defaults to the Vercel/Cloudflare headers, or a custom one) — feed it to `region.detect`. Works with Next.js `headers()` or any framework.

Fully optional and off by default — omit `region` and nothing changes.
