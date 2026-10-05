# Instructions for coding agents

For AI coding tools (Codex, Cursor, Antigravity, Copilot, Claude Code and others): the short version
of [CONTRIBUTING.md](./CONTRIBUTING.md) plus the rules that are easy to get wrong. CONTRIBUTING.md
wins if the two disagree; fix this file when that happens.

Task guides live in `.agents/skills/<name>/SKILL.md`. Read the matching one before starting:

| Task | Guide |
|---|---|
| Anything that touches consent behaviour, a public API, a config option, or more than one package | `.agents/skills/plan-major-change/SKILL.md` (read this first, before any code) |
| Add a consent-gated vendor integration to `@cookieyes/scripts` | `.agents/skills/add-vendor-integration/SKILL.md` |
| Add a language to `@cookieyes/translations` | `.agents/skills/add-locale/SKILL.md` |
| Add or change a page on the docs site | `.agents/skills/write-docs-page/SKILL.md` |
| Write the changeset for a user-facing change | `.agents/skills/write-changeset/SKILL.md` |

## The repo

Public, MIT-licensed monorepo (pnpm workspaces + Turborepo). Node 20 or newer, pnpm 10. The
README has the full layout. In short: `sdk/*` are the published packages (`core` is the engine
with zero runtime dependencies; `react` and `nextjs` are wiring only; plus `scripts`,
`translations`, `cli` and `test`), `apps/web` is developers.cookieyes.com (docs source in
`apps/web/content/shared`, rules in `apps/web/AGENTS.md`), `tools/size` measures bundles,
`matrix` checks peer compatibility, `docs/design` holds design notes.

## Commands

```bash
pnpm install --frozen-lockfile  # never plain pnpm install: it rewrites the lockfile and drops other platforms
pnpm lint:fix && pnpm lint      # Biome: format and lint; then pnpm typecheck
pnpm build                      # all sdk/* packages
pnpm test                       # Vitest, 80% coverage gate; one package: pnpm --filter @cookieyes/core test
pnpm size                       # measure bundles after pnpm build; updates tools/size/size-report.json
pnpm build:web                  # docs site: runs the generators and the doc-example type-check too
```

## How to work

- Do the task that was asked. Do not refactor, rename, reformat or "improve" code outside it.
- No new abstraction, helper, option, parameter or layer unless this change needs it now. Three
  plain lines are better than a helper used once.
- No new dependencies, devDependencies included, and no `pnpm-lock.yaml` change without asking first.
- Before changing behaviour, read the module, its tests in `src/__tests__/`, and any note in
  `docs/design/` about it. The comments in this codebase record past bugs; take them seriously.
- A large or unclear task is not started by writing code. Follow `plan-major-change`: research,
  ask the developer, propose, wait.
- `lane:core` (consent engine, regulation logic, categories, consent records, script and network
  blocking) is maintainer-owned: mistakes there have legal consequences for sites using the SDK.
  Changes there need an approved issue first. Open lanes (vendors, locales, adapters, docs) do not.
- Do not commit or push unless the developer asks. Never publish; CI publishes.

## Things that must not break

- All business logic lives in `@cookieyes/core`. `react` and `nextjs` only wire it to the
  framework.
- Nothing loads and no cookie is set before the gating category is granted. Integrations use
  `load: "afterConsent"` unless they are cookie-free by design.
- An unknown region resolves to the strictest regulation, never the lightest
  (`sdk/core/src/region.ts`).
- Server and client resolve the same consent state; no hydration mismatch and no banner flash.
  Read `docs/banner-first-paint.md` before touching banner rendering, `critical.css` or
  anything server-rendered.
- `core`, `react`, `nextjs` and `test` pin their public surface in
  `src/__tests__/exports.test.ts`. Adding or removing an export anywhere is an API change: update
  that test where it exists, the docs and the changeset.
- A change to consent behaviour updates `@cookieyes/test` in the same PR, including the
  "Fidelity & limitations" table in `sdk/test/README.md`.

## Known traps

Things that look safe and are not. Each is recorded in the code; read the comment there first.

- **A missing stylesheet import fails silently.** Nothing checks at runtime that `styles.css`
  loaded; the banner renders unstyled, and once shipped that way. Next.js apps import
  `@cookieyes/nextjs/styles.css`, never the `@cookieyes/react` path, which pnpm's strict layout
  cannot resolve (`sdk/cli/src/commands/init.ts`). With `<CookieYesStyles />` the import goes away.
- **No `@layer` in `cookieyes.css`, on purpose.** It was removed because host resets such as
  `* { margin: 0 }` beat layered rules and stripped the banner's padding (commit `f0ea2db`). No
  test stops it coming back; do not add it.
- **`:root` token defaults in `cookieyes.css` must equal `computeThemeVars(undefined, false)` and
  `DARK_OVERRIDES`** (`sdk/react/src/styles/tokens.ts`, guarded by `styles-parity.test.ts`). They
  drifted silently once. `theme` and `colorScheme` do nothing in `@cookieyes/core` alone.
- **Lazy modules must stay lazy.** Never statically import or barrel-export `theme-runtime.ts`,
  `integrations-lazy.ts` or the network blocker; Rollup then flattens the `import()` and the bytes
  return to every consumer's initial download (`sdk/react/src/styles/load-theme-runtime.ts`).
- **`process.env.NODE_ENV` is written as that exact literal** at the call site. A `const`, a
  `typeof process` guard or `globalThis.process?.env` stops bundlers from removing dev-only code
  (`sdk/core/src/deprecations.ts`).
- **The translations barrel never re-exports a locale table**; that would bundle every language
  into every consumer (`sdk/translations/src/index.ts`).
- **The taxonomy hash is `id:required:gcm` in list order** (`sdk/core/src/categories.ts`). Any
  change, even reordering, asks every visitor again. Cookies without a `tax` field are accepted
  only for the default five categories, and `server-consent.ts` must mirror `manager.ts` exactly
  or returning visitors see a banner flash. Category ids cannot contain `,` or `:`.
- **`persist()` writes the cookie, then notifies, then runs isolated side effects**, in that
  order (`sdk/core/src/manager.ts`). A throwing `dataLayer.push` once left the banner stuck.
- **Integrations:** `setup` always runs on a microtask; a duplicate id is skipped; a category
  outside the configured taxonomy means the integration never loads (there is a warning);
  `onRevoke: "remove"` must never load and then remove (`sdk/core/src/integrations.ts`).
- **SSR and hydration:** per-visitor state never lives on the singleton runtime
  (`server-consent.ts`); `GatedFrame` renders no iframe during SSR or first hydration; the banner
  re-parent must not re-animate (`Banner.tsx`); `useThemeVars` has no dependency array on purpose;
  the network blocker gates on committed consent, not the live toggle.
- **`resetConsentRuntime` must uninstall the network blocker**, or the next init silently never
  applies its rules (`sdk/core/src/runtime.ts`).
- **`sdk/nextjs/src/index.ts` is a `"use client"` re-export barrel** and `getServerConsent` stays
  in `./server`. The directive is added at build time to every file except `server` and
  `styles-route` (`rollup.shared.mjs`), so do not hand-add it to those two.
- **Peer ranges drive the compatibility matrix.** Widening a `peerDependencies` range without a
  matching matrix combination fails the build (`matrix/scripts/derive-check.mjs`); the floor is
  compared as an exact string so it cannot drift. `HIGHEST_VERIFIED_REACT_MAJOR` is kept in sync
  by a test.
- **`CORE_VERSION` is a build-time sentinel**; `0.0.0-dev` means unknown (`sdk/core/src/version.ts`).
  `@cookieyes/test`'s `SUPPORTED_CORE_RANGE` must match its peer range; a test asserts it.
- **`tools/size/fixtures/*` stay outside the pnpm workspace.** A workspace link under-measured
  the interface layer by 1.18 KB (`tools/size/README.md`).

## Bundle size

- `pnpm size` covers `core`, `react` and `nextjs` only (`tools/size/sdk-fingerprint.mjs`). After
  changing their `src`, their Rollup configs or their `package.json` export fields, run
  `pnpm build && pnpm size` and commit `tools/size/size-report.json`; `pnpm build:web` and CI fail
  on a stale one. Other packages never need it, and re-measuring for them only adds noise.
- Budgets in `tools/size/budgets.json` are ceilings. If a change grows a bundle, first remove the
  growth. If the growth is justified, raise the budget in the same PR with the reason written in
  the file. Never raise a budget to make a red build green.
- Size figures in changesets or docs come from `pnpm size` output only. Never estimate.

## TypeScript and formatting

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`: optional properties are
  typed `?: T | undefined`. Relative imports end in `.js`.
- Biome formats and lints: 2 spaces, double quotes, semicolons, 100 columns. Run `pnpm lint:fix`.
- Every `biome-ignore` states its reason after the colon. No `eslint-disable`: there is no ESLint.

## Comments

- Comments explain why: the constraint, the bug that happened, the alternative that was rejected.
  They do not describe what the next line does. No TODO, FIXME or commented-out code.
- Full sentences, as short as the reason allows. Match the density of the file you are in and do
  not add comments to lines you did not change.
- Every exported symbol has a prose `/** ... */` block. No `@param`, `@returns` or `@throws`;
  `@example` where a one-liner helps; `@internal` on underscore-prefixed exports.

## Tests

- Tests live in `src/__tests__/<module>.test.ts` next to the code. Import `describe`, `it`,
  `expect` from `vitest`; globals are off.
- `describe` names the function, `it` states the behaviour in plain English.
- Coverage threshold is 80%, never lowered. A behaviour change and its test land in one commit.
- The Vitest environment per package is deliberate (jsdom: core, react, scripts; node: cli,
  translations, nextjs, test). Never change a `vitest.config.ts` to pass a test; opt one file in
  with `// @vitest-environment jsdom`.

## Generated files: do not hand-edit

| Path | Regenerate with | After changing |
|---|---|---|
| `apps/web/content/docs/{nextjs,react,core}/**` | `pnpm --filter @cookieyes/web generate:framework-docs` | anything in `apps/web/content/shared` |
| `sdk/react/src/styles/critical.css` | `pnpm --filter @cookieyes/react build:critical-css` | `cookieyes.css` |
| `tools/size/size-report.json` | `pnpm build && pnpm size` | `core`, `react` or `nextjs` source |
| `PEER-MATRIX` blocks in `README.md`, `sdk/react/README.md`, `sdk/nextjs/README.md` | `pnpm --filter @cookieyes/web generate:peer-matrix-readme` | `matrix/matrix-results.json` |
| `matrix/matrix-results.json` | the `peer-matrix` workflow | peer-dependency ranges |

The sidecar files `apps/web/content/shared/**/*.sidecar.ts` are hand-written but checked: a new
config option, component prop or CSS token needs its entry there or `pnpm build:web` fails.

## Docs and READMEs

Never document an option, default, prop, export or behaviour you have not read in the source.
Docs source is `apps/web/content/shared` (rules in `apps/web/AGENTS.md`). Package READMEs are
published to npm; keep their examples valid against the current API.

## This repo is public

Nothing internal goes into code, comments, docs, commits or changesets: no ticket numbers, no
internal document paths, no customer names, no credentials, no links to internal tools. A design
decision worth keeping goes in `docs/design/` as a note anyone may read.

## Commits, changesets and PRs

- Conventional Commits: `type(scope): summary`. Types in use: `feat`, `fix`, `docs`, `perf`,
  `refactor`, `test`, `style`, `chore`, `build`. Scopes in use: `core`, `react`, `nextjs`,
  `scripts`, `cli`, `translations`, `test`, `web`, `size`, `matrix`.
- One logical change per commit. A regenerated file goes in the commit that changed its source.
- Every user-facing change has a changeset (`write-changeset` guide). `@cookieyes/web` is private
  and never appears in one.

## Before you say you are done

1. `pnpm lint:fix && pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`.
2. Touched `core`, `react` or `nextjs` source? `pnpm size`; commit the report; explain any budget change.
3. Touched `cookieyes.css`? Regenerate `critical.css`.
4. Touched a config option, prop, token or export? Sidecar, docs page, `exports.test.ts`.
5. Touched consent behaviour? `@cookieyes/test` and its fidelity table.
6. Touched docs? `pnpm build:web` passes, generated framework docs regenerated and committed.
7. Changeset written.
8. Re-read the whole diff. Remove anything the task did not need.
9. Report what you ran and the results, including failures. Never claim a check you did not run.
