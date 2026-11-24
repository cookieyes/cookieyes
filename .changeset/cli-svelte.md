---
"@cookieyes/cli": minor
---

`npx @cookieyes/cli init` now sets up a Vite and Svelte 5 project: it installs `@cookieyes/svelte`, writes `src/lib/cookieyes.ts` and `src/lib/CookieYesRoot.svelte`, imports `@cookieyes/svelte/styles.css` in `src/main.ts` and renders `<CookieYesRoot />` in `src/App.svelte`.

**New: `--framework svelte`.** A project with `svelte` in its dependencies is detected as Svelte, after Next.js, Nuxt, React and Vue. It asks the same questions as for the other frameworks. When `main.ts` or `App.svelte` has a shape the CLI cannot patch safely, it leaves the file untouched and prints a "Manual step needed" note with the lines to add.

**SvelteKit is not set up as Svelte.** A project with `@sveltejs/kit` in its dependencies is still treated as vanilla JavaScript, because it has no `main.ts` or `App.svelte` to patch.
