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
- Submit a pull request that fixes an open issue or adds a well-scoped improvement.

If you're planning a larger change (new feature, breaking change, architectural shift),
please open an issue to discuss it first — this saves everyone time and avoids a PR being
rejected after significant work.

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
  update tests for any behavioral change.
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
