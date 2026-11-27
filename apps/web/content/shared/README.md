# Docs content

The docs are written **once**, here, and published **once per framework** under
`content/docs/nextjs`, `content/docs/react`, `content/docs/vue`, `content/docs/nuxt`,
`content/docs/svelte`, `content/docs/sveltekit`, `content/docs/astro` and `content/docs/core`. Those directories are generated (`pnpm generate:framework-docs`, also run
by `dev` and `build`) and must not be edited by hand.

## Publishing a page

A body opts in to each framework it applies to, in its frontmatter:

```yaml
frameworks: [nextjs, react, vue, nuxt, svelte, sveltekit, astro, core]
```

Nothing is published by default. A page with no `frameworks:` fails the generator, so
publishing a React-only page to JavaScript is always a decision someone made.

## Writing for more than one framework

`@cookieyes/nextjs` re-exports the whole `@cookieyes/react` surface, so for everything the
two share only the import differs. Write examples against either package; inside fenced
code the name is rewritten to the framework the page is published under. It is never
rewritten in prose, where the two packages are usually being compared, and never for
`@cookieyes/nextjs/server` or `/styles-route`, which exist in one package only.

Two other Next.js conventions are rewritten away outside Next.js: a leading `"use client";`
line is dropped, and `app/` at the start of a fence title becomes `src/`. Title a shared
example `app/cookieyes.tsx` and a React or JavaScript reader sees `src/cookieyes.tsx`.

A fence that names a package on purpose opts out:

````md
```ts frameworkSwap=false
````

Where frameworks genuinely differ (a server-rendered layout, an inlined-CSS recipe, a
vanilla-JS variant), wrap the section:

```mdx
<Framework when="nextjs">

…

</Framework>

<Framework when="react core">

…

</Framework>
```

### Vue

`@cookieyes/vue` has its own API (a plugin, components that take `class` and slots, composables
that return refs), so a React example is never rewritten into a Vue one. Nothing in a fence is
rewritten on a Vue page, and the `@cookieyes/react` to `@cookieyes/nextjs` swap does not apply.
Vue code is written by hand inside `<Framework when="vue">`, in `ts` fences and in `vue` fences
(single-file components). Title each file (`title="src/App.vue"`) the way a React example is
titled.

A shared fence that imports `@cookieyes/react` or `@cookieyes/nextjs` therefore must not reach a
Vue page. Wrap it in `<Framework when="nextjs react">` and give Vue its own block. The build
enforces this: a Vue page whose composed output has a `tsx` fence, an `@cookieyes/react` or
`@cookieyes/nextjs` import, a `"use client"` line or `useSyncExternalStore` fails the generator
check in `check-examples.mjs` and the docs build, even in a fence marked `frameworkSwap=false`.
Prose may still name the other packages. Pages with no code (conceptual ones) add `vue` to their
frontmatter and need no block.

### Nuxt

`@cookieyes/nuxt` is a module over `@cookieyes/vue`, so Nuxt code is written by hand too, inside
`<Framework when="nuxt">`, under the same guard as Vue. Nothing in a fence is rewritten, and
`app/` titles stay `app/`: Nuxt has an `app/` directory of its own. Configuration goes in
`nuxt.config.ts` under `cookieyes`, options that hold functions in `app/app.config.ts`, and
`<CookieYesRoot />` in `app/app.vue`. The components and composables are auto-imported, so a
Nuxt example imports none of them; types come from `@cookieyes/nuxt`. The headless namespaces
(`Banner`, `Preferences`, `OptOut`) are the exception: a template only sees `Banner.Root` when the
component imports `Banner`, from `#imports`.

### Svelte

`@cookieyes/svelte` has its own API too (a `<CookieYesProvider>` component, components that take
`class` and snippets, hooks that return `{ current }` for a single value), so Svelte code is
written by hand inside `<Framework when="svelte">`, in `ts` fences and in `svelte` fences
(components, in Svelte 5 runes syntax). Nothing in a fence is rewritten. Title each file
(`title="src/App.svelte"`) the way a React example is titled.

The guard is wider than Vue's: a Svelte page whose composed output has a `tsx` or `vue` fence, an
`@cookieyes/react`, `@cookieyes/nextjs`, `@cookieyes/vue` or `@cookieyes/nuxt` import, a
`"use client"` line or `useSyncExternalStore` fails the build. Pages with no code add `svelte`
to their frontmatter and need no block.

### SvelteKit

`@cookieyes/sveltekit` is an integration over `@cookieyes/svelte`, so SvelteKit code is written by
hand too, inside `<Framework when="sveltekit">`, in `ts` and `svelte` fences. Nothing in a fence is
rewritten. The config lives in one shared module, `src/lib/cookieyes.ts`; `cookieyesHandle(config)`
goes in `src/hooks.server.ts`, `loadConsent` in `src/routes/+layout.server.ts`, and
`<CookieYesRoot>` in `src/routes/+layout.svelte`. Title each file with its path in the app.
Import the shared config by a relative path (`./lib/cookieyes` from `src/hooks.server.ts`,
`../lib/cookieyes` from `src/routes/`), never `$lib/`: SvelteKit 3 removed that alias, and the
package supports SvelteKit 2 and 3. There
is no stylesheet import: the handle writes the critical CSS and links the stylesheet route.

The guard is the Svelte one plus `@cookieyes/svelte`: everything an app needs is imported from
`@cookieyes/sveltekit`, and under pnpm's strict layout an app that installed only that package
cannot import `@cookieyes/svelte`. `CookieYesProvider` is not exported; `<CookieYesRoot>` wraps
it.

### Astro

`@cookieyes/astro` is an integration, and its components are `.astro` files, so Astro code is
written by hand too, inside `<Framework when="astro">`, in `ts` and `astro` fences. Nothing in a
fence is rewritten. The options go in `astro.config.ts` (`cookieyes({ ... })` in `integrations`;
the same code works in `astro.config.mjs`), the components are imported from
`@cookieyes/astro/components` into the layout, and options that hold functions go in
`src/cookieyes.client.ts`. Browser code imports the functions of `@cookieyes/astro/client` in a
`<script>`. Title each file with its path in the app. There is no stylesheet import: the
integration adds the critical CSS and links the stylesheet route.

Astro has no hooks and no provider. A page that documents a hook in the other adapters points to
the matching function of `@cookieyes/astro/client` (`client-functions.mdx` is the Astro-only page
that lists them). Headless pages stay without `astro`: the headless primitives are not exported.

The guard rejects an import of any other adapter, a `tsx`, `vue` or `svelte` fence, a `"use client"`
line and `useSyncExternalStore`.

Blocks may nest, and a heading may sit inside one when the whole section belongs to one
framework: the table of contents is built after the blocks are resolved, so each framework
sees only its own headings. `@cookieyes/core` has no components and no hooks, so its examples are
always hand-written inside `<Framework when="core">`; nothing is rewritten for it.

## Links

Link the way you always did: `/docs/hooks/use-consent`. At render time the link goes to
that page under the reader's framework, or to the first framework that has it.

## Checks

`scripts/check-examples.mjs` type-checks every `ts`/`tsx` fence against the built SDK, once
per framework the page is published under, after the same rewriting the build applies. A
swap that produced code that does not compile fails the build, not a reader.

On a Vue page the `ts` fences and the `vue` fences compile together with `vue-tsc`, against the
built `@cookieyes/vue`: each file is written under its `title`, so a `.vue` component can import
the module a `ts` fence defines and the reverse. The `@cookieyes/vue/styles.css` import compiles
without a declaration of its own; the harness supplies one.

On a Nuxt page the `ts` and `vue` fences are checked inside a small Nuxt app that installs
`@cookieyes/nuxt`, prepared once with `nuxi prepare`, so auto-imports and the `cookieyes` keys
are typed. Each file is written under its `title`: a fence titled `nuxt.config.ts` or
`app/app.config.ts` is checked as that file, and an untitled fence lands in `app/`.

On a Svelte page the `ts` fences and the `svelte` fences compile together with `svelte-check`,
against the built `@cookieyes/svelte`, the same way: each file under its `title`, and the
`@cookieyes/svelte/styles.css` import declared by the harness. `verbatimModuleSyntax` is on, as
in a new Svelte project, so a type is imported with `import type`.

On a SvelteKit page the `ts` and `svelte` fences are checked inside a small SvelteKit app that
installs `@cookieyes/sveltekit`, synced with `svelte-kit sync` before each group so `$app/*` and
the route `$types` resolve, and then checked with `svelte-check`. Each file is written under its
`title` (`src/hooks.server.ts`, `src/routes/+layout.svelte`); an untitled fence lands in
`src/lib/`. The app ships a `src/lib/cookieyes.ts`, a `src/routes/+layout.server.ts` and a
`src/app.d.ts` that a group may replace.

On an Astro page the `ts` and `astro` fences are checked inside a small Astro app that installs
`@cookieyes/astro`, with `astro check`, which generates the types (including the typed
`Astro.locals.cookieyes`) for exactly the files of each group. Each file is written under its
`title` (`astro.config.ts`, `src/layouts/Layout.astro`, `src/pages/index.astro`,
`src/cookieyes.client.ts`); an untitled fence lands in `src/lib/`. The app ships an
`astro.config.ts` with `cookieyes()`, a layout with `<CookieYesRoot />` and an empty page, all of
which a group may replace. Use ```` ```astro check="false" ```` for a fragment that is not a whole
file, such as one component tag.

Fences under one heading compile together, so a layout can import the module the fence above
it defines. When the files of one walkthrough sit under separate step headings, give each fence
the same `group="name"` and they compile together anyway.
