#!/usr/bin/env node
// matrix/scripts/scaffold-example-app.mjs
//
// Copies matrix/example-app/ into a fresh scratch directory and rewrites its
// package.json's `__PLACEHOLDER__` fields for one combination — a plain
// string-template substitution, no templating engine needed (§5.2). No
// install happens here; that's run-combination.mjs's job, so this stays
// trivially unit-testable.
//
// IMPORTANT — why the same tarball placeholders also appear under
// `pnpm.overrides`, not just `dependencies`: `@cookieyes/react`/`core` etc.
// are *real, currently-published* npm packages. `@cookieyes/nextjs`'s own
// packed package.json declares its dependency on `@cookieyes/react` as a
// plain semver ("0.5.0"), not a `file:` spec (that's what `pnpm pack`
// produces from a `workspace:*` dependency). Without `pnpm.overrides`
// pinning every `@cookieyes/*` name to the same local tarball everywhere in
// the graph, pnpm resolves that *nested* dependency from the real npm
// registry instead of the local build under test — silently testing
// whatever's currently published, not the code being verified. Confirmed by
// running the matrix locally: without this override, `@cookieyes/nextjs`'s
// internal copy of `@cookieyes/react` was a second, registry-resolved
// instance with its own module-level singletons (including its own
// `SsrConsentContext`), which broke the `initialConsent`/`getServerConsent`
// context read for a returning visitor even though every other check
// passed. `pnpm.overrides` makes it impossible for any package in this
// scratch project's graph — direct or transitive — to resolve
// `@cookieyes/*` from anywhere but the tarball under test.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const templateDir = join(repoRoot, "matrix", "example-app");

/**
 * Directories/files never copied into a scratch instance — build output and
 * dependency trees from a previous local run of the template itself, if any.
 */
const EXCLUDE = new Set(["node_modules", ".next", "tests/vitest.config.mts.timestamp"]);

/**
 * Plain `__X__` -> value substitution over a package.json's *text*, not a
 * templating engine — the placeholders only ever appear as whole JSON string
 * values (see matrix/example-app/package.json), so a global string replace is
 * exact and easy to unit test.
 *
 * @param {string} packageJsonText
 * @param {{ tarballs: Record<string, string>, versions: { next: string, react: string,
 *   reactDom: string, typesReact: string, typesReactDom: string } }} combo
 * @returns {string}
 */
export function renderPackageJson(packageJsonText, { tarballs, versions }) {
  const replacements = {
    __TARBALL_NEXTJS__: `file:${tarballs["@cookieyes/nextjs"]}`,
    __TARBALL_REACT__: `file:${tarballs["@cookieyes/react"]}`,
    __TARBALL_CORE__: `file:${tarballs["@cookieyes/core"]}`,
    __TARBALL_TEST__: `file:${tarballs["@cookieyes/test"]}`,
    __TARBALL_SCRIPTS__: `file:${tarballs["@cookieyes/scripts"]}`,
    __NEXT_VERSION__: versions.next,
    __REACT_VERSION__: versions.react,
    __REACT_DOM_VERSION__: versions.reactDom,
    __TYPES_REACT_VERSION__: versions.typesReact,
    __TYPES_REACT_DOM_VERSION__: versions.typesReactDom,
  };

  let result = packageJsonText;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!result.includes(placeholder)) {
      throw new Error(
        `[scaffold-example-app] template package.json is missing placeholder "${placeholder}" — ` +
          "matrix/example-app/package.json and this script have drifted apart.",
      );
    }
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * Copies the example-app template into `targetDir` and rewrites its
 * package.json for `combo`. Returns the scratch app's absolute path.
 *
 * @param {{ combo: import("../matrix.config.mjs").Combination, tarballs: Record<string, string>,
 *   targetDir: string }} options
 */
export function scaffoldExampleApp({ combo, tarballs, targetDir }) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const rel = src.slice(templateDir.length + 1);
      return !EXCLUDE.has(rel);
    },
  });

  const packageJsonPath = join(targetDir, "package.json");
  const rendered = renderPackageJson(readFileSync(packageJsonPath, "utf8"), {
    tarballs,
    versions: combo.versions,
  });
  writeFileSync(packageJsonPath, rendered);

  return targetDir;
}

async function main() {
  const args = process.argv.slice(2);
  const comboId = args.find((a) => a.startsWith("--combo="))?.slice("--combo=".length);
  const tarballsPath = args.find((a) => a.startsWith("--tarballs="))?.slice("--tarballs=".length);
  const target = args.find((a) => a.startsWith("--target="))?.slice("--target=".length);

  if (!comboId || !tarballsPath || !target) {
    console.error(
      "[scaffold-example-app] Usage: node scaffold-example-app.mjs --combo=<id> " +
        "--tarballs=<path-to-json-from-pack-tarballs> --target=<scratch-dir>",
    );
    process.exitCode = 1;
    return;
  }

  const { combinations } = await import("../matrix.config.mjs");
  const combo = combinations.find((c) => c.id === comboId);
  if (!combo) {
    console.error(`[scaffold-example-app] Unknown combination id "${comboId}".`);
    process.exitCode = 1;
    return;
  }

  const tarballs = JSON.parse(readFileSync(tarballsPath, "utf8"));
  const appDir = scaffoldExampleApp({ combo, tarballs, targetDir: target });
  console.log(`[scaffold-example-app] Scaffolded "${comboId}" into ${appDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
