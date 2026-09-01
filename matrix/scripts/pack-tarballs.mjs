#!/usr/bin/env node
// matrix/scripts/pack-tarballs.mjs
//
// D1 — real package resolution, not `workspace:*`. Runs `pnpm pack` against
// the four SDK packages the example app depends on and writes the tarballs
// into a shared scratch directory, so each matrix combination can install
// them via a `file:` dependency the way a real consumer would.
//
// Assumes `pnpm build --filter './sdk/*'` has already run (each package's
// `dist/` must exist — `pnpm pack` packs whatever `files` currently points
// at). This mirrors CI's `build-sdk` job (§5.6): build once, pack once,
// upload as an artifact, reused by every combination job.
//
// Usage:
//   node matrix/scripts/pack-tarballs.mjs [--out=<dir>]
// Prints a JSON object `{ "@cookieyes/core": "/abs/path/to/tgz", ... }` to
// stdout — the exact shape scaffold-example-app.mjs consumes.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

/** Packages the example app depends on, in the order they should be packed. */
const PACKAGES = [
  { name: "@cookieyes/core", dir: join(repoRoot, "sdk", "core") },
  { name: "@cookieyes/react", dir: join(repoRoot, "sdk", "react") },
  { name: "@cookieyes/nextjs", dir: join(repoRoot, "sdk", "nextjs") },
  { name: "@cookieyes/test", dir: join(repoRoot, "sdk", "test") },
  // Not imported by the example app, but @cookieyes/nextjs depends on it, so it
  // must be packed and pinned like the rest — otherwise pnpm resolves that one
  // nested dependency from the registry (see scaffold-example-app.mjs's header).
  { name: "@cookieyes/scripts", dir: join(repoRoot, "sdk", "scripts") },
];

function parseArgs(argv) {
  const out = { out: join(repoRoot, "matrix", "results", "tarballs") };
  for (const arg of argv) {
    if (arg.startsWith("--out=")) out.out = arg.slice("--out=".length);
  }
  return out;
}

/**
 * Packs one package with `pnpm pack` into `outDir`, returning the tarball's
 * absolute path. Fails loudly (throws) if `dist/` is missing — packing a
 * from-source package would silently ship a stale or empty tarball.
 */
function packOne({ name, dir }, outDir) {
  const distDir = join(dir, "dist");
  if (!existsSync(distDir)) {
    throw new Error(
      `[pack-tarballs] ${name}: no dist/ at ${distDir} — run "pnpm build --filter './sdk/*'" first.`,
    );
  }

  const before = new Set(readdirSync(outDir));
  execFileSync("pnpm", ["pack", "--pack-destination", outDir], {
    cwd: dir,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const after = readdirSync(outDir);
  const newFile = after.find((f) => !before.has(f) && f.endsWith(".tgz"));
  if (!newFile) {
    throw new Error(
      `[pack-tarballs] ${name}: "pnpm pack" did not produce a new .tgz in ${outDir}.`,
    );
  }
  return join(outDir, newFile);
}

export function packTarballs(outDir) {
  // Absolute, so the `file:` specifiers written into the scratch app's
  // package.json resolve against the repo — not against the app directory.
  const absOutDir = resolve(outDir);
  mkdirSync(absOutDir, { recursive: true });
  /** @type {Record<string, string>} */
  const tarballs = {};
  for (const pkg of PACKAGES) {
    tarballs[pkg.name] = packOne(pkg, absOutDir);
  }
  return tarballs;
}

/** `pnpm pack`'s filename convention for a scoped package: "@scope/name" -> "scope-name-version.tgz". */
const TARBALL_PREFIX_TO_PACKAGE = new Map(
  PACKAGES.map((p) => [`cookieyes-${p.name.split("/")[1]}-`, p.name]),
);

/**
 * Rebuilds the `{ "@cookieyes/x": "/abs/path/to/tgz" }` manifest from a
 * directory of already-packed tarballs, by filename convention — used in CI
 * where the tarballs were packed on one runner (the `build-sdk` job) and
 * downloaded as an artifact onto a different one (each `run` job), so the
 * absolute paths `packTarballs()` returned there are no longer valid.
 *
 * @param {string} dir
 * @returns {Record<string, string>}
 */
export function resolveTarballsFromDir(dir) {
  /** @type {Record<string, string>} */
  const tarballs = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".tgz")) continue;
    const packageName = [...TARBALL_PREFIX_TO_PACKAGE.entries()].find(([prefix]) =>
      file.startsWith(prefix),
    )?.[1];
    if (packageName) tarballs[packageName] = resolve(dir, file);
  }

  const missing = PACKAGES.map((p) => p.name).filter((name) => !tarballs[name]);
  if (missing.length > 0) {
    throw new Error(
      `[pack-tarballs] resolveTarballsFromDir(${dir}): missing tarball(s) for ${missing.join(", ")}.`,
    );
  }
  return tarballs;
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  rmSync(out, { recursive: true, force: true });
  const tarballs = packTarballs(out);
  process.stdout.write(`${JSON.stringify(tarballs, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
