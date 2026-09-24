# Docs content

The docs are written **once**, here, and published **once per framework** under
`content/docs/nextjs`, `content/docs/react` and `content/docs/core`. Those three
directories are generated (`pnpm generate:framework-docs`, also run by `dev` and `build`)
and must not be edited by hand.

## Publishing a page

A body opts in to each framework it applies to, in its frontmatter:

```yaml
frameworks: [nextjs, react, core]
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

Fences under one heading compile together, so a layout can import the module the fence above
it defines. When the files of one walkthrough sit under separate step headings, give each fence
the same `group="name"` and they compile together anyway.
