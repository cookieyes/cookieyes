---
"@cookieyes/cli": minor
---

`npx @cookieyes/cli init` now sets up an Astro 6 or 7 project: it installs `@cookieyes/astro`, adds `cookieyes()` with the options you chose to the `integrations` in `astro.config`, and renders `<CookieYesRoot />` first in the `<body>` of your layout in `src/layouts`.

**New: `--framework astro`.** A project with `astro` in its dependencies or devDependencies is detected as Astro, before Nuxt, React, Vue and Svelte, which an Astro site only has as island frameworks. It asks the same questions as for the other frameworks. A layout is the one `.astro` file in `src/layouts` that has a `<body>` tag; with several, a `Layout`, `BaseLayout`, `Base` or `MainLayout` is preferred, and a layout that already renders `<CookieYesRoot />` is kept. Extra languages are imported in `astro.config`.

**Existing files are kept.** An `integrations` array is added to, and one that is missing is created. A project with no `astro.config`, no single layout to choose, or a config or layout with a shape the CLI cannot patch safely is left untouched, and it prints a "Manual step needed" note with the lines to add. Running `init` again does not add the integration twice. No `src/cookieyes.client.ts` is written: it holds options that are functions, such as integrations, and `init` does not ask for any.

**Island frameworks are refused.** `--framework react`, `--framework vue` or `--framework svelte` in a project detected as Astro stops with an error and writes nothing, as `--framework vue` does in a Nuxt project: use `--framework astro`.
