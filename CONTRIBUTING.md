# Contributing to the CookieYes Consent SDK

Thanks for your interest in contributing! This document explains how to set up the
project, the standards we hold code to, and how releases work. It applies across all
CookieYes packages in this monorepo (`@cookieyes/core`, `@cookieyes/react`,
`@cookieyes/nextjs`, `@cookieyes/cli`, `@cookieyes/translations`) — the process is the
same no matter which package you're working on.

## Ways to contribute

- Report a bug using the **Bug Report** issue template.
- Suggest a feature using the **Feature Request** issue template.
- Improve documentation.
- Add a vendor integration or a language — no issue needed, see
  [Adding a vendor or a language](#adding-a-vendor-or-a-language).
- Pick up a `help-wanted` issue from the [Roadmap](https://github.com/orgs/cookieyes/projects/3).
- Submit a pull request that fixes an open issue or adds a well-scoped improvement.

If you're planning a larger change (new feature, breaking change, architectural shift),
please open an issue to discuss it first — this saves everyone time and avoids a PR being
rejected after significant work.

## The Roadmap

The public [Roadmap](https://github.com/orgs/cookieyes/projects/3) is driven entirely by
labels — nobody drags cards. Every roadmap issue carries exactly one `roadmap:*` label and
exactly one `lane:*` label (a bot comments if the lane is missing or doubled).

| Label | Column | What it means |
|---|---|---|
| `roadmap:now` | Now | Being worked on in the current cycle. |
| `roadmap:next` | Next | Planned to start once Now clears. A priority, not a date. |
| `roadmap:later` | Later | We intend to do it. No timeline. |
| — | Shipped | Closed in the last 90 days. Closing an issue moves it here; reopening moves it back to Now. |
| `roadmap:declined` | *(off the board)* | Reviewed and not planned. The issue is closed with a one-sentence reason. |

**Who places issues.** Only maintainers (`@cookieyes/sdk-maintainers`) apply `roadmap:*`
labels, and they decide placement together at sprint planning — on a public board,
`roadmap:next` reads as a commitment.

**Lanes.** Contributions are welcome in the open lanes — `lane:vendors`, `lane:i18n`,
`lane:adapters`, `lane:docs`. These are additive: a new vendor or translation can't break
anyone's compliance. `lane:core` (including the jurisdiction engine) is maintainer-owned,
because a mistake there has legal consequences for the sites using the SDK.

**Two ways to contribute:**

1. **Adding a vendor or a language:** skip the issue — see
   [below](#adding-a-vendor-or-a-language). Copy an existing file, edit it, open a PR.
2. **Anything else marked `help-wanted`:** comment "claiming" on the issue and a maintainer
   will assign you. Open a PR when you're ready. If you can't finish, say so on the issue so
   someone else can pick it up.

**`good first issue`** (spelled with spaces — the exact label GitHub search and contributor
sites look for) goes only on issues that are in an open lane, need under ~50 lines,
involve no architectural decision, and have an obvious place to start.

## Adding a vendor or a language

No issue or claiming needed — open a pull request directly. CI and a maintainer review it.
(The **Request a vendor integration** / **Request a locale** issue templates are for asking
someone *else* to add one.)

**A vendor integration** (`@cookieyes/scripts`):

1. Copy the integration closest to yours (e.g. `sdk/scripts/src/clarity.ts`) to
   `sdk/scripts/src/<vendor-id>.ts` and adapt it. Nothing may load, and no cookie may be set,
   until the declared category is granted.
2. Export its config type and factory from `sdk/scripts/src/index.ts`.
3. Add tests at `sdk/scripts/src/__tests__/<vendor-id>.test.ts`.
4. Add a docs page under `apps/web/content/docs/{react,nextjs}/integrations/` and list it in
   that folder's `meta.json`.
5. Add a changeset (`pnpm changeset`) for `@cookieyes/scripts`.

**A language** (`@cookieyes/translations`):

1. Copy `sdk/translations/src/en.ts` to `sdk/translations/src/<code>.ts` (a BCP 47 code) and
   rename its export to the code, hyphens dropped: `nl.ts` → `nl`, `pt-BR.ts` → `ptBR`.
2. Translate every string. Keep the `{seconds}` placeholder.
3. Add a `./<code>` sub-path to `exports` in `sdk/translations/package.json`.
4. Add a changeset (`pnpm changeset`) for `@cookieyes/translations`.

The build and the tests find the new file on their own. `pnpm test` fails with a clear
message if a key is missing, a string is empty, or the export isn't registered.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating you agree to uphold it.

## Development setup

**Prerequisites:** Node.js ≥ 20 and [pnpm](https://pnpm.io) ≥ 10.

```bash
git clone https://github.com/cookieyes/cookieyes.git
cd cookieyes
pnpm install
```

This is a [Turborepo](https://turbo.build) + pnpm-workspaces monorepo. All publishable
packages live under `sdk/*`.

### Common commands

| Command | What it does |
|---------|--------------|
| `pnpm build` | Build all packages with Rollup (ESM + CJS + types, minified) |
| `pnpm dev` | Watch-mode build for all packages |
| `pnpm test` | Run the Vitest suites |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | Biome lint + format check |
| `pnpm lint:fix` | Auto-fix lint issues and format |

## Coding standards

- **TypeScript strict mode.** The repo enables `strict`, `noUncheckedIndexedAccess`,
  and `exactOptionalPropertyTypes` — optional properties must be typed `?: T | undefined`.
- **Formatting & linting** are enforced by [Biome](https://biomejs.dev). Run
  `pnpm lint:fix` before pushing.
- **Keep adapters thin.** All business logic belongs in `@cookieyes/core`; framework
  packages (`react`, `nextjs`) should only wire the engine to the framework.
- **Tests** live next to source in `__tests__/` and run on jsdom via Vitest. Add or
  update tests for any behavioral change. (`@cookieyes/test` runs on **node** on
  purpose — that's the proof its harness needs no browser.)
- **Changing consent behaviour? Update `@cookieyes/test` in the same PR.**
  `@cookieyes/test` is the test double our users' own test suites assert against. It
  wraps the real engine rather than copying it, so most changes flow through
  automatically — but if you change what a category rule means, what a signal fires
  on, or anything listed in that package's **Fidelity & limitations** table, update
  the table and its tests alongside your change and call it out in the changeset.
  A silently drifted test double is worse than none: it tells our users their code
  is covered when it isn't.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org):
  `fix:`, `feat:`, `docs:`, `chore:`, `refactor:`, `test:`. Example:
  `fix(core): stop tracking scripts without a full page reload`. Keep commits focused —
  one logical change per commit where practical.

## Pull request workflow

1. Fork the repo and create a feature branch off `main`.
2. Make your change with `pnpm dev` running.
3. Ensure `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` all pass.
4. **Add a changeset:** run `pnpm changeset`, pick the affected packages and the
   semver bump, and write a short, user-facing summary. Commit the generated file in
   `.changeset/`.
5. Open a PR against `main`. CI must be green and at least one maintainer must approve.

## Releases

Releases are automated with [Changesets](https://github.com/changesets/changesets):

- Merging PRs that contain changesets opens/updates a **"Version Packages"** PR.
- Merging that PR bumps versions, updates changelogs, and publishes to npm with
  [provenance](https://docs.npmjs.com/generating-provenance-statements) via GitHub Actions.

You do **not** publish from your machine — `npm publish` is performed only by CI.

## Licensing

By submitting a contribution, you agree that it is licensed under this project's existing
license (see [LICENSE](./LICENSE), MIT).

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/cookieyes/cookieyes/issues/new/choose).
For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.
