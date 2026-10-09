# Contributing to the CookieYes Consent SDK

Thanks for your interest in contributing! This document explains how to set up the
project, the standards we hold code to, and how releases work. It applies across all
CookieYes packages in this monorepo (`@cookieyes/core`, `@cookieyes/react`,
`@cookieyes/nextjs`, `@cookieyes/scripts`, `@cookieyes/cli`, `@cookieyes/translations`,
`@cookieyes/test`) — the process is the same no matter which package you're working on.

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
4. Add a docs page under `apps/web/content/shared/integrations/` and list it in that folder's
   `meta.json`. (`apps/web/content/docs/*` is generated from `content/shared`; don't edit it.)
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
| `pnpm package-gate` | Check the packed tarballs after `pnpm build` (see [Package gate](#package-gate)) |

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

## Working with AI coding tools

You're welcome to use Claude Code, Codex, Cursor, Antigravity, Copilot or any other agent. The
repo carries the instructions they need, so every tool works to the same standard:

- [`AGENTS.md`](./AGENTS.md) holds the rules. Codex, Cursor, Antigravity and Copilot load it on
  their own; Claude Code loads it through `CLAUDE.md`. `apps/web/AGENTS.md` adds the docs-site
  rules when an agent works there. The layout is explained in [`.agents/README.md`](./.agents/README.md).
- `.agents/skills/*/SKILL.md` are step-by-step guides for recurring tasks (adding a vendor or a
  locale, writing a docs page or a changeset, planning a larger change). Tools that support
  skills pick them up; `.claude/skills/` links to the same files for Claude Code. On Windows
  without symlink support those links check out as text files, and the table at the top of
  `AGENTS.md` still points the agent at the right guide.
- `skills/*/SKILL.md` are different: guides for the AI tools of people *using* the SDK. They
  install with `npx skills add cookieyes/cookieyes` and the docs site serves them. That command
  also searches `.agents/skills/`, so every contributor skill carries `metadata.internal: true`
  to stay out of users' projects. `context7.json` steers answers from Context7 the same way.
- `pnpm agents:check` validates the skill files and links; CI runs it. `pnpm build:web`
  type-checks the code in every `skills/` guide against the built SDK, so a guide that no
  longer matches the API fails CI.

The agent does the typing; you own the result. Read the whole diff, run the checks, and make
sure the PR describes what changed and why. If an agent keeps making a mistake these files don't
cover, fix the files in the same PR — that's how the rules improve.

## Commits

Keep commits granular and meaningful: each one is a single change that makes sense on its
own and leaves the build passing. We value what a change does, not how many commits it takes.

- **One change per commit.** A fix, a feature, a refactor or a docs update each get their
  own commit. A regenerated file goes in the same commit as the source that produced it.
- **Every commit does something.** No empty commits, and no commits that only undo or
  patch the one before. Squash those into the commit they fix before you open the PR.
- **Small PRs where the work is naturally small.** A vendor integration, a locale or a docs
  page is a complete change on its own and can go in its own PR.
- Messages follow [Conventional Commits](https://www.conventionalcommits.org):
  `type(scope): summary`, with the summary at most 72 characters.

## Pull request workflow

1. Fork the repo and create a feature branch off `main`.
2. Make your change with `pnpm dev` running.
3. Ensure `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` all pass.
4. **Add a changeset:** run `pnpm changeset`, pick the affected packages and the
   semver bump, and write a short, user-facing summary. Commit the generated file in
   `.changeset/`.
5. Open a PR against `main`. CI must be green and at least one maintainer must approve.
   The autofix.ci bot may push a `style:` commit with Biome's formatting and safe lint
   fixes; pull before you push again. It does not touch `sdk/{core,react,nextjs,devtools}/src`
   or the Rollup configs, because any change there needs the size report regenerated, so
   run `pnpm lint:fix` yourself for those. Errors Biome cannot fix are always left to you.
   A bot comments with the PR's effect on bundle and package size, and a PR that grows
   core or the React layer past the per-change limit cannot merge. If the growth is
   deliberate, write `Size override: <reason>` in the PR description and ask a
   maintainer to add the `size-override` label. [`tools/size/README.md`](./tools/size/README.md)
   has the limits.

## Dependency release age

pnpm installs no third-party version until it has been on npm for 72 hours
(`minimumReleaseAge` in `pnpm-workspace.yaml`). A compromised release then has to survive three
days of public scrutiny before it can reach this repo. `@cookieyes/*` packages are excluded, so
our own releases install at once. Dependabot waits the same three days before proposing a
version (`cooldown` in `.github/dependabot.yml`), so its weekly PRs install cleanly.

If `pnpm add` or `pnpm update` fails with `ERR_PNPM_NO_MATCHING_VERSION` and the message says the
version "was released at" a recent date, the version you asked for is too new. Pick an older one
or wait.

To pin a known vulnerability out of the tree, use a range-scoped override in the `pnpm.overrides`
field of the root `package.json`. It rewrites only the vulnerable versions and leaves the rest of
the tree alone:

```json
"postcss@<8.5.14": "^8.5.14"
```

### Emergency bypass

A security fix published two hours ago is blocked too. Dependabot security updates ignore the
cooldown, so their PRs fail until the fix is 72 hours old. When a fix cannot wait:

1. **Who:** a member of `@cookieyes/sdk-maintainers` opens the PR, and a second maintainer
   approves it. Nobody bypasses alone.
2. **How:** add the exact version, never a range or a bare name, to `minimumReleaseAgeExclude` in
   `pnpm-workspace.yaml`, then run `pnpm install` and commit the lockfile with it:

   ```yaml
   minimumReleaseAgeExclude:
     - "@cookieyes/*"
     - "postcss@8.5.24"
   ```

3. **What to record:** in the PR description, the advisory (CVE or GHSA link), why the fix cannot
   wait 72 hours, and a check that the new version comes from the package's usual maintainers
   and repository.
4. **Afterwards:** once the version is 72 hours old, remove the entry in a follow-up PR, so the
   exclude list holds only `@cookieyes/*`.

## Releases

Releases are automated with [Changesets](https://github.com/changesets/changesets):

- Merging PRs that contain changesets opens/updates a **"Version Packages"** PR.
- Merging that PR bumps versions, updates changelogs, and publishes to npm with
  [provenance](https://docs.npmjs.com/generating-provenance-statements) via GitHub Actions.

You do **not** publish from your machine — `npm publish` is performed only by CI.

Keeping the AI guidance current is part of every release. A PR that changes a public API, a
config option or a default updates `skills/` and the `rules` in `context7.json` in the same PR.
Before merging the "Version Packages" PR, a maintainer reads its changelog against both and
fixes anything they no longer describe. `@cookieyes/sdk-maintainers` owns these files.

### Package gate

Before publishing, the release workflow tests the packed tarballs rather than the source: their
contents and stylesheets, publint and attw, a clean install with npm, pnpm, yarn and bun, and
that every package loads and `initCookieYes()` starts. It also runs on every pull request.
[`contributing/design/package-gate.md`](./contributing/design/package-gate.md) has the full
list and what it does **not** cover: consent before network, a single consent POST, Google
Consent Mode, server rendering and the cookie round-trip still need a browser harness.

Run it locally after `pnpm build`:

```bash
pnpm package-gate                   # contents, stylesheets, publint, attw, file list
pnpm package-gate:install --pm yarn # clean install and start with one package manager
```

If a PR adds or removes a published file on purpose, run `pnpm package-gate --update` and commit
`tools/package-gate/contents.json`; its diff shows reviewers exactly what changed in the package.

A failed gate blocks the publish only once the repository variable `PACKAGE_GATE_BLOCKING` is
`true`. Until then the release goes ahead with a warning.

## Licensing

By submitting a contribution, you agree that it is licensed under this project's existing
license (see [LICENSE](./LICENSE), MIT).

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/cookieyes/cookieyes/issues/new/choose).
For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.
