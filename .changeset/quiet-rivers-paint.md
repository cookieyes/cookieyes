---
"@cookieyes/nextjs": minor
"@cookieyes/react": patch
---

Put the banner's CSS in the first response: `<CookieYesStyles />` and a `styles-route` handler.

**The problem it removes.** The banner is server-rendered, so it is in the very first HTML — but the browser cannot paint it until the stylesheet arrives, and the stylesheet is a *second* round trip discovered only after the HTML has been parsed. On a slow connection that round trip costs more than the whole SDK. Measured on the Lighthouse Mobile profile (150 ms RTT, 4× CPU), cold cache: an empty Next.js page paints at 192 ms; the same page with the SDK and its stylesheet as a `<link>` paints at **468 ms**, of which ~276 ms is waiting for a 4 KB file.

**The fix.** `@cookieyes/nextjs/server` now exports `<CookieYesStyles />`. Render it once in your root layout's `<head>` and it emits:

1. an inline `<style>` holding `critical.css` — only the rules the banner needs to paint — so the first response is enough to paint the banner styled, and
2. a `<link>` to the full stylesheet with `media="print"`, which the browser fetches at low priority **without blocking render**. Once the SDK mounts, the client runtime switches it to `media="all"`.

`@cookieyes/nextjs/styles-route` exports a Route Handler `GET` that serves the full stylesheet, so nothing has to be copied into `public/` and there is no build step:

```tsx
// app/layout.tsx
import { CookieYesStyles } from "@cookieyes/nextjs/server";
<head><CookieYesStyles /></head>
```

```ts
// app/cookieyes/styles.css/route.ts
export { GET } from "@cookieyes/nextjs/styles-route";
```

Then remove `import "@cookieyes/nextjs/styles.css"` — leaving it puts the sheet back on the critical path.

**Measured** (same profile, same machine, 20 iterations): first paint **468 → 224 ms**, banner styled **451 → 183 ms** — within 32 ms of the empty page, and within 32 ms of a competitor that ships no stylesheet at all. Neutral on fast desktop, where there is no round trip to save. Bundle bytes are unchanged; this moves *when* the browser may paint, not how much it downloads.

**Opt-in, and the default is untouched.** Nothing changes unless you render the component. The one inline element it adds is static, so a strict `style-src` admits it with a single hash rather than `'unsafe-inline'`: the value is exported as `CRITICAL_CSS_HASH` (`'sha256-…'`), published with every release that changes the stylesheet, and pins exactly that byte sequence and nothing else. If you use nonces instead, pass `<CookieYesStyles nonce={nonce} />`. There is deliberately **no inline `<script>`** — the `print → all` switch runs from the SDK bundle your policy already admits — so `script-src` needs nothing. Without a CSP there is nothing to configure.

**How the bytes get in.** The CSS is injected at build time by a sentinel-replacement plugin, the same way `CORE_VERSION` is, from `@cookieyes/react`'s *built* output — the minified bytes a consumer actually ships. A Server Component cannot import a `.css` file (Turbopack rejects it as a non-ECMAScript asset), and a filesystem read fails under pnpm's layout and on Edge runtimes; a build-time string works everywhere. Tests assert the inlined string is byte-identical to `@cookieyes/react/critical.css` and that the exported hash is the hash of those bytes — one stray byte would break every consumer's policy silently.

**In `@cookieyes/react`:** `mountRuntime` now calls `_activateDeferredStylesheets()`, which flips any `link[data-cy-full]` from `media="print"` to `all`. SSR-safe, idempotent, and a no-op on pages that never rendered the component. Costs ~60 bytes gzip on the UI layers; core is untouched. Budgets pass.
