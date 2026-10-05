---
name: write-changeset
description: 'Write the .changeset file for a user-facing change in the house style: correct packages and bump, a lead sentence stating the outcome, bold "Action required" for anything users must do. Use before opening a PR that changes a published package.'
metadata:
  internal: true
---

# Write a changeset

The changeset becomes the CHANGELOG entry and the release notes. It is read by users of the
SDK, not by maintainers. Write it for them.

## 1. Which packages

List every package whose published output changes, including an adapter that re-exports a
changed symbol. `@cookieyes/web` is private and is never listed. A docs-only change to a
package README counts for that package. Dependabot bumps get their changeset from CI; do not
write one by hand.

## 2. Which bump

All packages are below 1.0, so:

| Change | Bump |
|---|---|
| Bug fix, README correction, internal change with no behaviour change | `patch` |
| New export, option, prop, locale, integration or behaviour | `minor` |
| Breaking change | `minor`, with a bold **Action required** paragraph |

Never `major` before 1.0 without a maintainer saying so.

## 3. The file

Create `.changeset/<kebab-topic>.md` by hand or rename the random name `pnpm changeset`
produces. The name describes the change: `core-network-blocker-own-entry-point.md`, not
`fuzzy-pigs-dance.md`.

```md
---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

One sentence stating what the user can now do or no longer has to worry about.

**Action required if you ...** What changed, why it was wrong before, exactly what to do now.

**New: `thing()`.** Where it lives, what it returns, one short code block if that helps.

A closing line for anything measured, quoted from `pnpm size` output.
```

## 4. Style

- Lead with the outcome for the user, not with what you edited.
- Paragraphs open with a bold run-in phrase; each covers one thing. Breaking paragraphs begin
  with **Action required**.
- Name symbols in backticks. Show a code block only when prose would be longer.
- Size figures only from `pnpm size`. Never estimate.
- Docs-only patches end with "Documentation only; no behaviour change."
- Nothing internal: no ticket numbers, no branch names, no internal document paths, no names.
- No em dashes.

Read two recent entries in the package's `CHANGELOG.md` to match the voice before writing.

## 5. Check

`pnpm changeset status` lists the pending changesets and their bumps. The file is committed with
the change it describes.
