---
"@cookieyes/sveltekit": minor
---

SvelteKit apps can now add the CookieYes consent banner with `@cookieyes/sveltekit`, with the banner in the server HTML and no flash for a returning visitor.

**New: `@cookieyes/sveltekit`.** Add `cookieyesHandle(config)` to `src/hooks.server.ts`, `export const load = loadConsent` to the root `+layout.server.ts`, and wrap the root layout's page in `<CookieYesRoot {config} state={data.consent}>`. The options are the same as `initCookieYes` everywhere else, and the components and hooks of `@cookieyes/svelte` are exported from this package too.

**Server rendering.** On every request the handle reads the consent cookie, the Vercel and Cloudflare geo headers and `Sec-GPC`, as `@cookieyes/nextjs` does, so a visitor who already chose gets no banner markup and a California visitor gets the CCPA banner from the first byte. It also inlines the critical CSS (publishing `CRITICAL_CSS_HASH` for a strict `style-src`), links the full stylesheet from a route you mount with one re-export of `@cookieyes/sveltekit/styles-route`, and with `googleConsentMode` adds Google Consent Mode's deny-by-default at the top of `<head>`, taking the nonce SvelteKit already wrote when there is one. Prerendered pages and `ssr = false` routes work too: a prerendered page is shared between visitors, so it never carries one visitor's choice or region, and the browser decides. Requires SvelteKit 2.62 or later and Svelte 5.20 or later.
