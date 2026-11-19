---
"@cookieyes/cli": minor
---

`npx @cookieyes/cli init` now sets up a Vue 3 project: it installs `@cookieyes/vue`, writes `src/consent-manager.ts` and `src/components/CookieYesRoot.vue`, calls `setupConsent(app)` in `src/main.ts` and renders `<CookieYesRoot />` in `src/App.vue`.

**New: `--framework vue`.** A project with `vue` in its dependencies is detected as Vue, a project that also has `react` stays React. It asks the same questions as for React. When `main.ts` or `App.vue` has a shape the CLI cannot patch safely, it leaves the file untouched and prints a "Manual step needed" note with the lines to add.

**Nuxt is not set up as Vue.** A project with `nuxt` in its dependencies is still treated as vanilla JavaScript. Picking Vue there prints a manual step and writes nothing, and `--framework vue` exits with an error.
