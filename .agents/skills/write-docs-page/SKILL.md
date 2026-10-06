---
name: write-docs-page
description: 'Add or rewrite a page on developers.cookieyes.com from the shared docs source, with correct frontmatter, framework handling, verified API facts and passing example checks. Use when asked to document a feature, fix a docs page, or add a guide.'
metadata:
  internal: true
---

# Write a docs page

The reader is a developer with a task. Give them the shortest accurate path. The rules in
`apps/web/AGENTS.md` apply throughout; this is the order of work.

## 1. Verify the facts first

Before writing a sentence, read the source for everything the page will state:

- the exported function, component or hook in `sdk/*/src`
- its config or props type, including the default the code applies
- the existing tests, which show the real behaviour
- the package README, so the page and the README agree

If the source and an existing page disagree, the source is right; fix the page and say so in
the PR.

## 2. Place the page

- File: `apps/web/content/shared/<section>/<page>.mdx`. Sections are the folders listed in
  `content/shared/_root-order.json`.
- Add the page to that folder's `meta.json` in a sensible position. A new top-level section goes
  in `_root-order.json` too.
- Add the page to `ENABLED_FILES` in `apps/web/scripts/check-examples.mjs`, or its code fences are
  never type-checked. The list is manual on purpose.
- Frontmatter, exactly these keys:

```yaml
---
title: useConsent
description: One sentence a search result can show.
frameworks: [nextjs, react]
---
```

Include `core` only when the page is true for plain JavaScript; `@cookieyes/core` has no
components or hooks, so its examples are hand-written inside `<Framework when="core">`.

## 3. Structure

Copy the structure of the closest existing page in the same section. Typical shape:

1. Lead paragraph: what it does, when to use it. Two or three sentences.
2. The main task, with one complete example that compiles.
3. Options or props, as a table with the real defaults.
4. "Good to know": the two or three facts that save a support ticket.
5. "Common mistakes": symptom in bold, then the fix.
6. "Next steps": two or three framework-relative links.

Leave out any section that would be empty. Do not add sections the neighbours do not have. Compare
the length with the neighbouring pages; if yours is much longer, cut it or split it.

## 4. Code fences

- Write examples against `@cookieyes/react` and title Next.js files `app/...`; the generator
  rewrites both per framework. See `content/shared/README.md` for `frameworkSwap=false` and
  `<Framework when="...">`.
- Every `ts`/`tsx` fence must compile against the built SDK. Fences under one heading compile
  together; use `group="name"` to join fences across headings.
- `check="false"` is only for a fragment that cannot stand alone. Never use it to hide an error.
- If an example imports a package that `apps/web/package.json` does not list, stop and ask before
  adding a devDependency, touching `pnpm-lock.yaml` or changing the checker. Often the example can
  be written without it.
- Package install commands use the `npm` fence language.

## 5. Language

Plain English, short sentences, active voice, sentence-case headings. No em dashes. No
marketing. No history of how the feature came to be. No internal references.

## 6. Check

```bash
pnpm build                                              # the SDK the examples compile against
pnpm --filter @cookieyes/web generate:framework-docs    # regenerate content/docs/*, commit the result
pnpm build:web                                          # generators, example type-check, next build
grep -rn "—" apps/web/content/shared                    # must print nothing
```

If you renamed a heading, grep `content/shared` for links to its old anchor.

## 7. Finish

Docs-only changes need no changeset unless a package README changed (then a `patch` for that
package, ending "Documentation only; no behaviour change."). Commit as
`docs(web): <what the reader can now do>`.
