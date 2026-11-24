---
"@cookieyes/cli": minor
---

`npx @cookieyes/cli init` now sets up a SvelteKit project: it installs `@cookieyes/sveltekit`, writes `src/lib/cookieyes.ts`, adds `cookieyesHandle(config)` to `src/hooks.server.ts`, exports `loadConsent` from `src/routes/+layout.server.ts`, serves the stylesheet from `src/routes/cookieyes/styles.css/+server.ts`, wraps the page in `<CookieYesRoot>` in `src/routes/+layout.svelte` and references the package's types in `src/app.d.ts`.

**New: `--framework sveltekit`.** A project with `@sveltejs/kit` in its dependencies is detected as SvelteKit, before Nuxt, React, Vue and Svelte. It asks the same questions as for the other frameworks. A project without a `tsconfig.json` gets `.js` files without types, and a project built with `adapter-static` gets no `+layout.server` file, a `<CookieYesRoot>` without `state`, and `export const prerender = true;` in the stylesheet route.

**Existing files are kept.** A `handle` already in `hooks.server` is composed with `sequence(cookieyesHandle(config), yourHandle)` when its shape is recognised. A `+layout.server` file the project already has is never overwritten, and a `hooks.server` or `+layout.svelte` with a shape the CLI cannot patch safely is left untouched. In each case it prints a "Manual step needed" note with the lines to add. Running `init` again changes nothing.

**SvelteKit is no longer treated as vanilla JavaScript.** `--framework svelte` in a SvelteKit project exits with an error pointing to `--framework sveltekit`.
