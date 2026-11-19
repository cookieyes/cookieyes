---
"@cookieyes/cli": minor
---

`npx @cookieyes/cli init` now sets up a Nuxt 4 project: it installs `@cookieyes/nuxt`, adds it to the `modules` in `nuxt.config.ts`, writes the options you chose under `cookieyes` in `app/app.config.ts` and renders `<CookieYesRoot />` first in `app/app.vue`.

**New: `--framework nuxt`.** A project with `nuxt` in its dependencies or devDependencies is detected as Nuxt, before Vue or React. It asks the same questions as for the other frameworks. A project without an `app/` directory gets `app.config.ts` and `app.vue` in its root, and a project with a JavaScript `nuxt.config` gets `app.config.js`.

**Existing files are kept.** An `app.config` the project already has is never overwritten, and a `nuxt.config` or `app.vue` with a shape the CLI cannot patch safely is left untouched. In each case it prints a "Manual step needed" note with the lines to add. Running `init` again does not add the module twice.

**Nuxt is no longer treated as vanilla JavaScript.** `--framework vue` in a Nuxt project still exits with an error, now pointing to `--framework nuxt`.
