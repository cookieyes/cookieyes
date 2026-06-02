# Release Checklist

Everything to configure before the first public release of the `@cookieyes/*` packages.

Legend: ✅ already configured in the repo · ⚠️ needs action from you · 🔁 run each release

---

## 1. GitHub repository

- [ ] ⚠️ **Decide the home of the repo.** All metadata points to `github.com/cookieyes/cookieyes`
      (package `repository`/`homepage`/`bugs`, README badges, SECURITY/issue links). The repo is
      currently under your personal account locally — confirm it will be pushed to the **`cookieyes`
      org**, or update every URL if it lives elsewhere.
- [ ] ⚠️ **Create the `sdk-maintainers` team** in the `cookieyes` org and give it write access —
      `CODEOWNERS` requests `@cookieyes/sdk-maintainers` on every PR. Teams only exist in orgs; if you
      publish under a personal account, replace the team handle with your username or delete `CODEOWNERS`.
- [ ] ⚠️ **Branch protection on `main`:** require the `CI` status check to pass, require ≥1 review
      (and "Require review from Code Owners" if you keep `CODEOWNERS`), and disallow force-pushes.
- [ ] ⚠️ **Enable Discussions** (the issue-template `config.yml` links users to
      `…/discussions` for questions) — or remove that contact link.

## 2. npm

- [ ] ⚠️ **Create the `@cookieyes` scope/org on npm** and confirm your account can publish to it.
- [ ] ⚠️ **Generate an npm _Automation_ access token** (not a "Publish" classic token — Automation
      tokens bypass 2FA in CI). Scope it to publish `@cookieyes/*`.
- [ ] ✅ Scoped packages publish publicly with provenance (`publishConfig.access: "public"`,
      `publishConfig.provenance: true` in every package).
- [ ] ⚠️ **Confirm none of the package names are taken** on npm (`npm view @cookieyes/core` etc.).

## 3. Secrets & GitHub Actions permissions

- [ ] ⚠️ **Add the `NPM_TOKEN` secret** (Settings → Secrets and variables → Actions) with the
      Automation token from step 2. `release.yml` reads `secrets.NPM_TOKEN`.
- [ ] ⚠️ **Allow Actions to open PRs:** Settings → Actions → General → Workflow permissions →
      enable **"Allow GitHub Actions to create and approve pull requests."** Without this the
      Changesets action cannot open the "Version Packages" PR.
- [ ] ✅ `release.yml` already sets `permissions: contents: write, pull-requests: write,
      id-token: write` and `NPM_CONFIG_PROVENANCE: "true"` (OIDC provenance).
- [ ] ℹ️ **Provenance only works from CI.** Never run `changeset publish` / `npm publish` locally
      with provenance on — it requires the GitHub OIDC token. `CONTRIBUTING.md` already states
      publishing is CI-only.

## 4. Versioning & first-release mechanics

- [ ] ⚠️ **Pick the initial published version.** Packages are at `0.1.0`; the root is `0.0.0` and
      `private` (correct — the root never publishes).
- [ ] ⚠️ **Understand how the first publish triggers.** `release.yml` runs on push to `main`:
  - With **pending changesets** → opens a "Version Packages" PR (no publish yet).
  - With **no pending changesets** → runs `changeset publish`, which publishes any package whose
    version isn't on npm yet. On a fresh registry that means **pushing to `main` with no changeset
    files will immediately publish `0.1.0` for all packages.**
  - **Decide deliberately:** either (a) let the first push publish `0.1.0`, or (b) add a changeset
    first so the first merge only opens the Version Packages PR and you publish by merging that.
- [ ] ℹ️ **Pre-1.0 semver.** While on `0.x`, prefer `minor` for breaking changes and `patch` for
      fixes; reserve your first `major` for the intentional `1.0.0`. Changesets will take a `major`
      on `0.x` straight to `1.0.0`.
- [ ] ✅ Changesets configured (`.changeset/config.json`: `access: public`, `baseBranch: main`,
      `updateInternalDependencies: patch`).

## 5. Repository metadata to verify

- [ ] ⚠️ **`LICENSE`** — confirm year/owner (`Copyright (c) 2026 CookieYes`) and that MIT is the
      intended license. Each package also ships its own `LICENSE`.
- [ ] ⚠️ **Contact address is real & monitored:** `support@cookieyes.com` is used in both
      SECURITY.md and CODE_OF_CONDUCT.md — confirm it's monitored and that whoever triages it knows
      to handle security reports and conduct reports (or set up forwarding to the right people).
- [ ] ⚠️ **GitHub private vulnerability reporting** is enabled (SECURITY.md links to
      `…/security/advisories/new`): Settings → Code security → enable.
- [ ] ✅ Each package has accurate `name`, `description`, `keywords`, `repository.directory`,
      `engines.node >=20`, `files` allowlist, and dual ESM/CJS `exports`.
- [ ] ⚠️ **README badges** resolve once public (CI badge, npm version badges per package).

## 6. Security & supply chain

- [ ] ⚠️ **Dependabot alerts + security updates** — Settings → Code security (separate from the
      existing `dependabot.yml`, which only schedules version-update PRs).
- [ ] ⚠️ **Secret scanning** (+ push protection) — Settings → Code security. Catches an accidental
      `NPM_TOKEN` commit.
- [ ] ◻️ **CodeQL** (optional, free for public repos) — Settings → Code scanning → Default setup,
      or add a `codeql.yml` workflow.
- [ ] ✅ `dependabot.yml` schedules weekly npm + github-actions update PRs.

## 7. Pre-flight technical verification (run before tagging a release) 🔁

- [ ] ✅ `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm build && pnpm test`
      all green (coverage gated at 80% per package).
- [ ] 🔁 **Inspect each tarball:** `cd sdk/<pkg> && pnpm build && npm pack --dry-run` →
      contains only `dist/`, `LICENSE`, `README.md` (no `src/`, no tests, no configs).
- [ ] 🔁 **Validate package correctness:** in each package run `npx publint` and
      `npx @arethetypeswrong/cli --pack` (catches broken `exports`/types, ESM↔CJS mismatches).
- [ ] 🔁 **CLI bin sanity:** confirm `sdk/cli/dist/index.js` starts with `#!/usr/bin/env node`.
- [ ] ◻️ **Full publish rehearsal with Verdaccio** (recommended): `npx verdaccio`, then
      `pnpm -r publish --registry http://localhost:4873 --no-git-checks`, install into a scratch app,
      and verify imports + `npx cookieyes init`. This also proves `workspace:*` deps were rewritten
      to real version ranges (no `workspace:*` should appear in the published tarballs).

## 8. First release

- [ ] ⚠️ Open a PR to `main` to confirm `CI` runs across Node 20/22/24 and passes.
- [ ] ⚠️ Trigger the release per your decision in §4 (either the auto-publish or the
      changeset → Version Packages PR → merge flow).

## 9. Post-release verification

- [ ] 🔁 On each npm package page, confirm the **"Built and signed · GitHub Actions"** provenance
      badge appears and links back to the build.
- [ ] 🔁 In a fresh, empty project (real registry): `npm install @cookieyes/react`, import it, and
      build — confirm ESM and CJS both resolve and types are picked up.
- [ ] 🔁 `npx @cookieyes/cli init` against a throwaway React and Next.js app.
- [ ] ℹ️ **Never reuse a version.** npm versions are immutable; if a published version is broken,
      ship a new patch rather than unpublishing.

---

### Quick triage — likely blockers if skipped

1. `NPM_TOKEN` secret missing → release job fails at publish.
2. "Allow Actions to create PRs" disabled → no Version Packages PR ever appears.
3. `@cookieyes` scope/team doesn't exist → publish 403 / unresolved `CODEOWNERS`.
4. Pushing to `main` with no changesets → unintended immediate `0.1.0` publish.
