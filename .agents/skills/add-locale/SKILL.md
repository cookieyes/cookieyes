---
name: add-locale
description: Add a language to @cookieyes/translations: the locale file, the package export, the locale lists in README and docs, and the changeset. Use when asked to add, translate or support a new language or locale.
---

# Add a locale

Open lane: no issue needed. The build and the tests discover the file on their own; the manual
work is the translation, the export entry and the places that list locales.

## 1. Pick the code

A BCP 47 code: `nl`, `pt-BR`, `sv`. The export name is the code with hyphens dropped: `nl.ts`
exports `nl`, `pt-BR.ts` exports `ptBR`. The tests enforce this.

## 2. Create the file

Copy `sdk/translations/src/en.ts` to `sdk/translations/src/<code>.ts`, rename the export, and
translate every string. Rules:

- Keep every key. Keep nested objects (`categories`, `optOut`, `embedPlaceholder`) intact.
- Keep placeholders exactly: `{seconds}`.
- Legal terms matter. "Do Not Sell or Share My Personal Information" is CCPA wording; translate
  it the way official privacy notices in that language do, not literally.
- Match the register of `en.ts`: polite, plain, no marketing.
- Do not translate `poweredBy` brand names.

If you are not fluent in the language, say so in the PR; a maintainer or a native speaker should
review the strings.

## 3. Register the sub-path export

Add `"./<code>"` to `exports` in `sdk/translations/package.json`, copying the shape of
`"./it"`. The barrel `index.ts` deliberately does not re-export locales, so do not add it there.

## 4. Test

`pnpm --filter @cookieyes/translations test` fails with a clear message if a key is missing, a
string is empty, a placeholder is lost, or the export is not registered.

## 5. Update every place that lists locales

Search for an existing code and add the new one wherever locales are listed:

```bash
grep -rn "translations/it" sdk apps/web/content/shared --include='*.md' --include='*.mdx' --include='*.ts'
```

Today that is `sdk/translations/README.md` (the locale count and the table) and
`apps/web/content/shared/translations.mdx`. Check whether `sdk/cli/src/commands/init.ts` offers
a fixed list of locales; if it does, add the new one there and to its tests.

Then regenerate the framework docs: `pnpm --filter @cookieyes/web generate:framework-docs`.

## 6. Changeset and finish

Changeset for `@cookieyes/translations`, bump `minor`: one sentence naming the language and the
import path. If the CLI picker changed, list `@cookieyes/cli` too. Then the checklist in the root
`AGENTS.md`. Do not run `pnpm size`: the measurement covers `core`, `react` and `nextjs` only, so
a locale cannot move it.

Commit as `feat(translations): add <Language> (<code>)`.
