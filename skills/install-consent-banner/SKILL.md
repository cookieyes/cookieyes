---
name: install-consent-banner
description: "Add the CookieYes consent banner to a Next.js, React, Vue, Nuxt, Svelte or plain JavaScript site with the open-source @cookieyes packages: install, initialise, render, verify."
---

# Install the CookieYes consent banner

Use this when someone wants a cookie consent banner in a Next.js, React, Vue, Nuxt, Svelte or plain JavaScript project, without a hosted service or an account. The packages are open source (Apache-2.0), run in the frontend and store the visitor's choice in a cookie. Full docs: https://developers.cookieyes.com/docs/nextjs (switch the framework in the sidebar).

## Decide two things first

1. **Regulation**: `"GDPR"` (opt-in, most sites) or `"CCPA"` (California-style opt-out). It applies to every visitor, so pick the strictest law your visitors fall under. To choose per visitor by country, set the `region` option instead (see the configuration docs); a manual `regulation` always wins over `region`. Under `"CCPA"` in React, Next.js or Svelte, also render `<CookieOptOut />` next to `<CookieBanner />`: the Do Not Sell button opens it.
2. **Mode**: `"cookie-only"` (default, no backend) or `"self-hosted"` with an `apiUrl`, only if a server-side record of each consent is required; `@cookieyes/backend` is a ready-made server that receives those records.

## Fastest path: the CLI

In an existing Next.js, React, Vue, Nuxt or Svelte (Vite) project, run:

```bash
npx @cookieyes/cli init
```

Without a terminal to answer in, pass the answers as flags, or it stops and names the flag it
needs: `npx @cookieyes/cli init --yes --regulation GDPR` (add `--api-url /api/consent` for
self-hosted, `--no-install` to skip installing; `--help` lists all).

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

### Vue 3

```bash
npm install @cookieyes/vue
```

Needs Vue 3.5 or later. Three files:

```ts title="src/consent-manager.ts" check="false"
import type { App } from "vue";
import { CookieYes, type CookieYesConfig } from "@cookieyes/vue";
import "@cookieyes/vue/styles.css";

const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };

export function setupConsent(app: App): void {
  app.use(CookieYes, config);
}
```

```vue title="src/components/CookieYesRoot.vue"
<script setup lang="ts">
import { CookieBanner, CookiePreferences, RecallButton } from "@cookieyes/vue";
</script>

<template>
  <CookieBanner />
  <CookiePreferences />
  <RecallButton />
</template>
```

In an existing Vue project, `npx @cookieyes/cli init` writes these files and wires them in. Otherwise call `setupConsent(app)` in `src/main.ts` after `createApp(App)` and before `app.mount("#app")`, and render `<CookieYesRoot />` once in `src/App.vue`, before the page content. Under `"CCPA"`, also render `<CookieOptOut />` next to `<CookieBanner />`.

### Nuxt 4

```bash
npx nuxi module add @cookieyes/nuxt
```

Options go under `cookieyes` in `nuxt.config.ts`; the module adds the stylesheet itself:

```ts title="nuxt.config.ts" check="false"
export default defineNuxtConfig({
  modules: ["@cookieyes/nuxt"],
  cookieyes: { mode: "cookie-only", regulation: "GDPR" },
});
```

Render the consent UI once in `app/app.vue`, outside `<NuxtPage />`. Components and composables are auto-imported:

```vue title="app/app.vue"
<template>
  <CookieYesRoot />
  <NuxtPage />
</template>
```

Options that hold functions (integrations from `@cookieyes/scripts`, callbacks) go under the same `cookieyes` key in `app/app.config.ts` with `defineAppConfig`, because `nuxt.config.ts` options travel as runtime config, which is JSON and drops functions. The module reads the consent cookie and the Vercel and Cloudflare geo headers on the server, so a returning visitor gets no banner in the HTML. `npx @cookieyes/cli init` sets all of this up in an existing Nuxt project.

### Svelte 5

```bash
npm install @cookieyes/svelte
```

Needs Svelte 5.20 or later. Two files:

```ts title="src/lib/cookieyes.ts" check="false"
import type { CookieYesConfig } from "@cookieyes/svelte";

export const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
```

```svelte title="src/lib/CookieYesRoot.svelte"
<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    CookieBanner,
    CookiePreferences,
    CookieYesProvider,
    RecallButton,
  } from "@cookieyes/svelte";
  import { config } from "./cookieyes";

  let { children }: { children?: Snippet } = $props();
</script>

<CookieYesProvider {config}>
  <CookieBanner />
  <CookiePreferences />
  <RecallButton />
  {@render children?.()}
</CookieYesProvider>
```

In an existing Svelte project built with Vite, `npx @cookieyes/cli init` writes these files and wires them in (it does not set up SvelteKit). Otherwise add `import "@cookieyes/svelte/styles.css";` to `src/main.ts` and wrap the page content in `<CookieYesRoot>` once in `src/App.svelte`, so components inside it can use the hooks. Under `"CCPA"`, also render `<CookieOptOut />` next to `<CookieBanner />`.

### Plain JavaScript, Angular

```bash
npm install @cookieyes/vanilla
```

```ts title="src/consent.ts"
import { start } from "@cookieyes/vanilla";
import "@cookieyes/vanilla/styles.css";

export const cookieyes = start({
  mode: "cookie-only",
  regulation: "GDPR",
});
```

Import this file once from the page's entry script. `start` draws the same banner, dialogs and recall button as the React components and takes the same configuration. Only if the user wants a banner of their own design, use `@cookieyes/core` instead and render it from `consentStore`: https://developers.cookieyes.com/docs/core/store/build-your-own-ui

## Verify

1. Load the site: the banner appears at the bottom.
2. Click **Accept All**, reload: the banner stays away and a small round button reopens the preferences.
3. To test again, delete the `cookieyes-consent` cookie.

## Common mistakes

- **Banner renders as plain text**: the `styles.css` import is missing.
- **Nothing renders and no error**: `<CookieYesRoot />` is not rendered anywhere, so `initCookieYes()` never ran. In Vue the composables throw instead if `app.use(CookieYes, config)` never ran, and in Svelte the hooks throw if no `<CookieYesProvider>` is above the component.
- **An integration or callback set in `nuxt.config.ts` silently does nothing** (Nuxt): runtime config drops functions. Move it under `cookieyes` in `app/app.config.ts`; the module warns about this in development.
- **"You're importing a component that needs use client"** (Next.js): the consent file lost its `"use client"` line, or `initCookieYes()` was called in the layout.
- **Set `regulation` to `"GDPR"` or `"CCPA"`**, or leave it out to behave as GDPR.
- **`tsc` reports TS2882 for the `styles.css` import** in a fresh Next.js checkout: run `next dev` or `next build` once. It creates `next-env.d.ts`, which loads the Next.js types that declare CSS imports.

## Next

- Every option: https://developers.cookieyes.com/docs/nextjs/getting-started/configuration
- Load analytics and ads only after consent: use the `gate-third-party-scripts` skill on this host.
- Unit-test code that depends on consent: use the `test-consent` skill on this host.
