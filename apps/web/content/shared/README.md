# Docs content

The docs are written **once**, here, and published **once per framework** under
`content/docs/nextjs`, `content/docs/react`, `content/docs/vue` and `content/docs/core`. Those three
directories are generated (`pnpm generate:framework-docs`, also run by `dev` and `build`)
and must not be edited by hand.

## Publishing a page

A body opts in to each framework it applies to, in its frontmatter:

```yaml
frameworks: [nextjs, react, vue, core]
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

Fences under one heading compile together, so a layout can import the module the fence above
it defines. When the files of one walkthrough sit under separate step headings, give each fence
the same `group="name"` and they compile together anyway.
