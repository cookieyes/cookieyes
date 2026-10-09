# Package gate

Every other check in this repo runs against the source folder. The package gate runs against
the packed tarballs, which are what npm receives and what users install. A packaging mistake (a
missing stylesheet, a broken `exports` path, a leftover `workspace:*`, a dependency nobody
declared) passes every source check and still ships broken. The gate exists to stop that.

Code: `tools/package-gate/`. Workflow: `.github/workflows/package-gate.yml`, run on every pull
request and by `release.yml` before publishing.

## What it checks

1. **Contents** (`check.mjs`, about 6 seconds for all packages):
   - no `workspace:`, `link:`, `file:`, `portal:` or `catalog:` specifier in any dependency field
     of the packed `package.json`
   - no test files, snapshots, mocks, fixtures or mock workers
   - every file `main`, `module`, `types`, `bin` and every `exports` leaf points at is in the
     tarball, and so is every source a sourcemap names
   - every exported stylesheet has at least ten selectors with the package's class prefix
     (`.cy-`, or `.cyd-` for devtools), so an empty or wrong file fails, not just a missing one
   - publint in strict mode, and attw with the `node16` profile
   - the file list matches `tools/package-gate/contents.json`
2. **Install and start** (`install.mjs` and `smoke.mjs`, one fresh `node:22` container per
   package manager): npm, pnpm, yarn and bun each install all tarballs into an empty project,
   then every `exports` sub-path is loaded with `import` and `require`, every stylesheet path
   resolves, the CLI's `--help` runs, and `initCookieYes()` runs with the documented minimal
   config both ways.
3. **Accessibility**: the existing axe test (`sdk/react/src/__tests__/a11y.test.tsx`).

## What to protect

- **Pin our packages to the tarballs.** They depend on each other by exact version. pnpm, yarn
  and bun fetch that version from the registry unless the consumer pins it (`pnpm.overrides`,
  `resolutions`, `overrides`), which tests a published copy, or fails on a version that is not
  published yet. Each was seen doing it. npm reuses the top-level tarball. `smoke.mjs` compares
  every copy that resolves, including the ones each package resolves for its siblings, against
  the tarball by `package.json` and `require` entry. The entry alone was not enough: a release
  that changes only types has the same code as the published version, and a registry copy passed.
- **Yarn is the strict run.** The consumer depends on every package directly, so a package that
  forgot to declare a dependency can still reach the consumer's copy. npm, pnpm and bun cannot
  be stopped from that (Node walks up to the project's `node_modules`); Yarn's
  `YARN_PNP_FALLBACK_MODE=none` can, and caught it when tested. Do not loosen it.
- **Nothing on the machine counts.** Every cache is created inside the throwaway project, and
  Yarn's global cache and mirror are off. With the mirror on, Yarn installed from it in two
  seconds. In CI the container is fresh as well.
- **Real paths.** macOS's temp directory is a symlink; Yarn then could not tell which package
  was running the CLI and refused its declared dependency. The scripts use real paths.
- **attw output goes to a file.** attw exits before a pipe drains, which cut its JSON off at
  64 KB as soon as it found problems.
- **`contents.json` normalizes chunk hashes** to `[hash]`, so it changes only when a file is
  added or removed. Update it with `pnpm package-gate --update` and commit the diff; the diff is
  the review.

## Report first, then block

`release.yml` runs the gate before `changeset publish`. A failure stops the publish only when
the repository variable `PACKAGE_GATE_BLOCKING` is `"true"`. Until then the release goes ahead
with a warning, so a new check that turns out flaky cannot block a release. Set it once the gate
has passed reliably for a few releases.

The release run tests tarballs packed from the same commit and lockfile as the ones
`changeset publish` uploads, not the uploaded files themselves: `changeset publish` packs again.

## What it does not cover

These need real apps in a browser and a harness that does not exist yet. Do not read a green
gate as covering them.

- **Consent before network:** no request or cookie before the gating category is granted.
- **Single POST:** one consent record per decision.
- **Google Consent Mode:** the right signals, at the right time.
- **Server rendering:** server and client agree, no banner flash, no hydration mismatch.
- **Cookie round-trip:** a written consent cookie is read back the same.
- **TypeScript's `node10` resolution:** not supported; it ignores `exports`.
- **Older Node, React and Next versions:** the install runs on Node 22 with the compatibility
  matrix's newest combination. The matrix covers the older ones.
