# @cookieyes/nuxt

## 0.1.0

### Minor Changes

- 46c21a1: Nuxt 4 apps can now add the CookieYes consent banner with one module, with the banner in the server HTML and no flash for a returning visitor.

  **New: `@cookieyes/nuxt`.** Add it to `modules` (or run `npx nuxi module add @cookieyes/nuxt`), set your options under `cookieyes` in `nuxt.config.ts`, and put `<CookieYesRoot />` in `app.vue`. The options are the same as `initCookieYes` everywhere else; options that hold functions, such as integrations and callbacks, go under the same key in `app.config.ts`, because runtime config is JSON and drops functions. The components and composables of `@cookieyes/vue` are auto-imported, and `networkBlocker` rules work without a `registerNetworkBlocker()` call.

  **Server rendering.** On every request the module reads the consent cookie and the Vercel and Cloudflare geo headers, as `@cookieyes/nextjs` does, so a visitor who already chose gets no banner markup and a California visitor gets the CCPA banner from the first byte. It also inlines the critical CSS (publishing `CRITICAL_CSS_HASH` for a strict `style-src`), serves the full stylesheet from `/cookieyes/styles.css`, and with `googleConsentMode` adds Google Consent Mode's deny-by-default at the top of `<head>`, before any Google tag. `ssr: false`, `nuxt generate` and routes cached with `swr`, `isr`, `cache` or `prerender` rules work too: their HTML is shared between visitors, so it never carries one visitor's choice or region, and the browser decides.

### Patch Changes

- Updated dependencies [514d3b9]
  - @cookieyes/vue@0.1.0
