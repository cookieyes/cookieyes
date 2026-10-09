#!/usr/bin/env node
// Installs the packed tarballs into an empty project with one package manager, then
// loads every package and starts the SDK (smoke.mjs). CI runs it once per package
// manager, each in a fresh container.
//
// Usage (after `pnpm package-gate`, which writes the tarballs):
//   node tools/package-gate/install.mjs --pm <npm|pnpm|yarn|bun> [--tarballs <dir>] [--keep]
//
// The project lives in the OS temp directory, outside this repo, so no workspace
// package can satisfy an import. Every download cache is created inside it, so nothing
// already on the machine can stand in for a missing dependency either.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const pm = option("--pm");
const keep = args.includes("--keep");
// macOS's temp directory is a symlink. Yarn records package locations under the path it
// was given while Node runs a bin from the real path, so Yarn could not tell which
// package was asking and refused the CLI's own dependency. Real paths throughout.
const temp = realpathSync(tmpdir());
const tarballDir = realpathSync(
  resolve(option("--tarballs", join(temp, "cookieyes-package-gate", "tarballs"))),
);

/**
 * Package-manager versions, each at least 72 hours old when chosen. npm is the one
 * bundled with Node. Raising one is a normal change; the gate then tests the new one.
 */
const TOOLS = { pnpm: "pnpm@10.22.0", yarn: "yarn@4.18.1", bun: "bun@1.4.2" };
if (!["npm", ...Object.keys(TOOLS)].includes(pm)) {
  console.error("usage: install.mjs --pm <npm|pnpm|yarn|bun> [--tarballs <dir>] [--keep]");
  process.exit(2);
}

// Peer versions come from the compatibility matrix's newest combination, so the two
// never disagree about what "supported" means.
const { combinations } = await import(join(repoRoot, "matrix", "matrix.config.mjs"));
const newest = combinations.find((c) => c.role === "newest");
const peers = {
  next: newest.versions.next,
  react: newest.versions.react,
  "react-dom": newest.versions.reactDom,
};

/** Reads one file out of a tarball without unpacking it. */
const fromTarball = (tarball, file) =>
  execFileSync("tar", ["-xzOf", tarball, `package/${file}`], { maxBuffer: 64 * 1024 * 1024 });

/** Resolves an exports entry the way `require()` does: conditions in key order. */
function requireTarget(node) {
  if (typeof node === "string") return node;
  if (node === null || typeof node !== "object") return null;
  for (const [condition, value] of Object.entries(node)) {
    if (!["require", "node", "default"].includes(condition)) continue;
    const target = requireTarget(value);
    if (target) return target;
  }
  return null;
}

const tarballs = readdirSync(tarballDir)
  .filter((f) => f.endsWith(".tgz"))
  .map((f) => join(tarballDir, f));
if (tarballs.length === 0) {
  console.error(`no tarballs in ${tarballDir}; run \`pnpm package-gate\` first`);
  process.exit(2);
}

const expected = { packages: {} };
const ours = {};
for (const tarball of tarballs) {
  const manifest = JSON.parse(fromTarball(tarball, "package.json").toString("utf8"));
  ours[manifest.name] = `file:${tarball}`;
  const entry = manifest.exports?.["."];
  const requireEntry = entry ? requireTarget(entry)?.replace(/^\.\//, "") : null;
  expected.packages[manifest.name] = {
    version: manifest.version,
    subpaths: Object.keys(manifest.exports ?? {}),
    requireEntry,
    // Same recipe as smoke.mjs's fingerprint(): package.json, then the entry.
    fingerprint: requireEntry
      ? createHash("sha256")
          .update(fromTarball(tarball, "package.json"))
          .update(fromTarball(tarball, requireEntry))
          .digest("hex")
      : null,
    siblings: [],
    bin: manifest.bin
      ? Object.keys(typeof manifest.bin === "string" ? { [manifest.name]: 1 } : manifest.bin)
      : [],
    deps: { ...manifest.dependencies, ...manifest.peerDependencies },
  };
}
for (const pkg of Object.values(expected.packages)) {
  pkg.siblings = Object.keys(pkg.deps).filter((dep) => expected.packages[dep]?.requireEntry);
  delete pkg.deps;
}

const work = mkdtempSync(join(temp, `cookieyes-gate-${pm}-`));
const cache = join(work, ".cache");
mkdirSync(cache);

// Our packages depend on each other by exact version. pnpm, yarn and bun fetch those
// from the registry (a published copy, or nothing at all for a version not yet
// released), so they are pinned to the tarballs; each was seen doing it. npm reuses
// the top-level tarball because its version satisfies the range. smoke.mjs checks that
// every copy that resolves is the tarball's.
const manifest = {
  name: "cookieyes-gate-consumer",
  private: true,
  type: "module",
  dependencies: { ...ours, ...peers },
};
if (pm === "pnpm") manifest.pnpm = { overrides: ours };
if (pm === "yarn") manifest.resolutions = ours;
if (pm === "bun") manifest.overrides = ours;
writeFileSync(join(work, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(work, "gate-expected.json"), `${JSON.stringify(expected, null, 2)}\n`);
copyFileSync(join(here, "smoke.mjs"), join(work, "smoke.mjs"));

const env = {
  ...process.env,
  npm_config_cache: join(cache, "npm"),
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_update_notifier: "false",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  // CI=true makes pnpm and yarn refuse to create a lockfile; there is none to freeze.
  YARN_ENABLE_IMMUTABLE_INSTALLS: "false",
  YARN_ENABLE_GLOBAL_CACHE: "false",
  // Yarn also copies every package into a machine-wide mirror and installs from it.
  YARN_ENABLE_MIRROR: "false",
  // This project depends on every package directly, so a package that forgot to declare
  // a dependency can still reach the project's copy (tested: react without
  // @cookieyes/core passed). A user who installs only that package gets the error. Yarn
  // is the run that catches it: by default it lets any package borrow the project's
  // dependencies, and this turns that off. npm, pnpm and bun cannot be made to: Node
  // finds the project's own node_modules by walking up from any installed package.
  YARN_PNP_FALLBACK_MODE: "none",
  YARN_CACHE_FOLDER: join(cache, "yarn"),
  YARN_ENABLE_TELEMETRY: "0",
  BUN_INSTALL_CACHE_DIR: join(cache, "bun"),
};

function sh(cmd, cmdArgs) {
  console.log(`$ ${[cmd, ...cmdArgs].join(" ")}`);
  execFileSync(cmd, cmdArgs, { cwd: work, env, stdio: "inherit" });
}

// The package manager itself is fetched, not taken from the machine.
let tool;
if (pm === "npm") tool = ["npm"];
else if (pm === "bun") {
  sh("npm", ["install", "--prefix", join(work, ".tools"), "--no-save", TOOLS.bun]);
  tool = [join(work, ".tools", "node_modules", ".bin", "bun")];
} else tool = ["corepack", TOOLS[pm]];
const [bin, ...pre] = tool;

const timings = {};
const timed = (label, fn) => {
  const started = Date.now();
  fn();
  timings[label] = (Date.now() - started) / 1000;
};

let ok = false;
try {
  timed("install", () => {
    if (pm === "npm") sh(bin, ["install"]);
    if (pm === "pnpm") {
      sh(bin, [...pre, "install", "--no-frozen-lockfile", "--store-dir", join(cache, "pnpm")]);
    }
    if (pm === "yarn") sh(bin, [...pre, "install"]);
    if (pm === "bun") sh(bin, ["install"]);
  });
  // Yarn's default install has no node_modules; its loader must be in the process.
  timed("load and start", () => {
    if (pm === "yarn") sh(bin, [...pre, "node", "smoke.mjs"]);
    else sh("node", ["smoke.mjs"]);
  });
  timed("cli", () => {
    for (const name of Object.values(expected.packages).flatMap((p) => p.bin)) {
      if (pm === "npm") sh(bin, ["exec", "--no", "--", name, "--help"]);
      if (pm === "pnpm") sh(bin, [...pre, "exec", name, "--help"]);
      if (pm === "yarn") sh(bin, [...pre, name, "--help"]);
      if (pm === "bun") sh(bin, ["run", name, "--help"]);
    }
  });
  ok = true;
} finally {
  const rows = Object.entries(timings).map(([step, s]) => `${step} ${s.toFixed(1)}s`);
  const summary = `### Package gate: ${pm}\n\n${ok ? "✅" : "❌"} ${tarballs.length} tarballs, peers next@${peers.next} react@${peers.react}. ${rows.join(", ")}\n\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (keep) console.log(`kept ${work}`);
  else rmSync(work, { recursive: true, force: true });
}
