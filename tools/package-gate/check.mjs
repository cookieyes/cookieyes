#!/usr/bin/env node
// Packs every published package and checks the tarball itself, not the source folder.
//
// Usage (after `pnpm build`):
//   node tools/package-gate/check.mjs [--out <dir>] [--update]
//
// For each package under sdk/ that is not private:
//   - the packed package.json has no workspace:, link:, file:, portal: or catalog:
//     specifier left in any dependency field
//   - no test files, snapshots, mocks, fixtures or mock workers are included
//   - every file package.json points at (main, module, types, bin, every exports leaf)
//     and every source a sourcemap points at is in the tarball
//   - every exported stylesheet contains the package's class prefix, so an empty or
//     wrong file cannot pass a presence check
//   - publint (strict) and attw (node16 profile) pass
//   - the file list matches tools/package-gate/contents.json; `--update` rewrites it
//
// Writes the tarballs and report.json (every file with its size) to --out, for the
// install stage and as the record of what each publish contained. Exits non-zero
// and names the package, the check and the reason for every failure.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const contentsPath = join(repoRoot, "tools", "package-gate", "contents.json");

const args = process.argv.slice(2);
const update = args.includes("--update");
const outArg = args.indexOf("--out");
const outDir = resolve(outArg === -1 ? join(tmpdir(), "cookieyes-package-gate") : args[outArg + 1]);

/** Class prefix each stylesheet must contain. A package not listed ships no CSS. */
const CSS_PREFIX = {
  "@cookieyes/react": ".cy-",
  "@cookieyes/nextjs": ".cy-",
  "@cookieyes/devtools": ".cyd-",
};
/**
 * Stylesheets that are empty on purpose. `@cookieyes/devtools/styles.css` resolves to
 * this outside the `development` condition, so a production build ships no panel CSS.
 */
const STUB_STYLESHEETS = { "@cookieyes/devtools": ["dist/stub.css"] };
/** A stylesheet with fewer prefixed selectors than this is treated as broken. */
const MIN_PREFIXED_SELECTORS = 10;

const DEP_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"];
const LOCAL_SPECIFIER = /^(workspace|link|file|portal|catalog):/;
const FORBIDDEN_FILES = [
  /(^|\/)__tests__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /(^|\/)__snapshots__\//,
  /\.snap$/,
  /(^|\/)__mocks__\//,
  /(^|\/)(__fixtures__|fixtures)\//,
  /mockServiceWorker\.js$/,
  /\.tsbuildinfo$/,
  /(^|\/)\.env(\.|$)/,
];

const failures = [];
const fail = (pkg, check, detail) => failures.push({ pkg, check, detail });

function run(cmd, cmdArgs, options = {}) {
  return execFileSync(cmd, cmdArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function listFiles(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [relative(base, full)];
  });
}

/** Every string leaf of an exports map, with the path of conditions that leads to it. */
function exportLeaves(node, trail = []) {
  if (typeof node === "string") return [{ trail, target: node }];
  if (node === null || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) => exportLeaves(value, [...trail, key]));
}

/**
 * Rollup names shared chunks `<name>-<hash>`, and the hash changes with any code change.
 * The recorded file list replaces it, so it changes only when a file is added or removed.
 * Real file names are lowercase, so an 8-character suffix with an uppercase letter, a
 * digit or an underscore is a hash.
 */
function normalizeHash(file) {
  return file.replace(/-([A-Za-z0-9_-]{8})(\.[a-z.]+)$/, (match, hash, ext) =>
    /[A-Z0-9_]/.test(hash) ? `-[hash]${ext}` : match,
  );
}

const packages = readdirSync(join(repoRoot, "sdk"))
  .map((dir) => join(repoRoot, "sdk", dir))
  .filter((dir) => existsSync(join(dir, "package.json")))
  .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
  .filter(({ manifest }) => !manifest.private)
  .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "tarballs"), { recursive: true });
const extractRoot = join(outDir, "extracted");

const { publint } = await import("publint");
const { formatMessage } = await import("publint/utils");

const report = { packages: {} };
const contents = {};

for (const { dir, manifest } of packages) {
  const name = manifest.name;
  const started = Date.now();

  // `pnpm pack` is what `changeset publish` uses, so this is the file npm receives.
  const packed = run("pnpm", ["pack", "--pack-destination", join(outDir, "tarballs")], { cwd: dir })
    .trim()
    .split("\n")
    .pop();
  const tarball = resolve(dir, packed);
  const pkgRoot = join(extractRoot, name.replace("/", "__"));
  mkdirSync(pkgRoot, { recursive: true });
  run("tar", ["-xzf", tarball, "-C", pkgRoot]);
  const root = join(pkgRoot, "package");
  const files = listFiles(root).sort();
  const fileSet = new Set(files);
  const packedManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  // Specifiers that only mean something inside this repo.
  for (const field of DEP_FIELDS) {
    for (const [dep, spec] of Object.entries(packedManifest[field] ?? {})) {
      if (LOCAL_SPECIFIER.test(spec)) fail(name, "local specifier", `${field}.${dep} is "${spec}"`);
    }
  }

  for (const file of files) {
    if (FORBIDDEN_FILES.some((pattern) => pattern.test(file))) {
      fail(name, "file that must not ship", file);
    }
  }

  // Every file the manifest points at must exist.
  const claimed = [];
  for (const field of ["main", "module", "types", "typings"]) {
    if (typeof packedManifest[field] === "string") claimed.push([field, packedManifest[field]]);
  }
  const bin = packedManifest.bin;
  if (typeof bin === "string") claimed.push(["bin", bin]);
  else for (const [cmd, target] of Object.entries(bin ?? {})) claimed.push([`bin.${cmd}`, target]);
  for (const [subpath, entry] of Object.entries(packedManifest.exports ?? {})) {
    for (const { trail, target } of exportLeaves(entry)) {
      claimed.push([`exports["${subpath}"]${trail.map((t) => `.${t}`).join("")}`, target]);
    }
  }
  for (const [where, target] of claimed) {
    const file = target.replace(/^\.\//, "");
    if (!fileSet.has(file))
      fail(name, "missing file", `${where} points at ${target}, not in the tarball`);
  }

  // A sourcemap that names a source the tarball lacks shows "file not found" in a debugger.
  for (const file of files.filter((f) => f.endsWith(".map"))) {
    const map = JSON.parse(readFileSync(join(root, file), "utf8"));
    for (const source of map.sources ?? []) {
      const target = relative(
        root,
        resolve(dirname(join(root, file)), map.sourceRoot ?? "", source),
      );
      if (!fileSet.has(target)) fail(name, "sourcemap source missing", `${file} -> ${source}`);
    }
  }

  // Stylesheets: present, and actually ours.
  const prefix = CSS_PREFIX[name];
  const stubs = STUB_STYLESHEETS[name] ?? [];
  const sheets = new Set(
    claimed.map(([, target]) => target.replace(/^\.\//, "")).filter((f) => f.endsWith(".css")),
  );
  if (prefix && sheets.size === 0) fail(name, "stylesheet", "no stylesheet in exports");
  for (const sheet of sheets) {
    if (stubs.includes(sheet) || !fileSet.has(sheet)) continue;
    const css = readFileSync(join(root, sheet), "utf8");
    const escaped = (prefix ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const count = prefix ? (css.match(new RegExp(`${escaped}[a-z]`, "g")) ?? []).length : 0;
    if (count < MIN_PREFIXED_SELECTORS) {
      fail(
        name,
        "stylesheet",
        `${sheet} has ${count} "${prefix}" selectors (${css.length} bytes); expected at least ${MIN_PREFIXED_SELECTORS}`,
      );
    }
  }

  // publint, strict: a warning is a failure. The extracted tarball is linted as-is.
  const { messages } = await publint({ pkgDir: root, pack: false, strict: true });
  for (const message of messages) {
    fail(name, `publint ${message.type}`, formatMessage(message, packedManifest) ?? message.code);
  }

  // attw on the tarball. node10 is not supported (it ignores "exports"), and it cannot
  // read stylesheets, which the check above covers.
  const hasTypes = claimed.some(([where]) => /types/.test(where));
  if (hasTypes) {
    const cssEntries = Object.keys(packedManifest.exports ?? {}).filter((k) => k.endsWith(".css"));
    const attwArgs = [tarball, "--profile", "node16", "--format", "json"];
    if (cssEntries.length) attwArgs.push("--exclude-entrypoints", ...cssEntries);
    // attw exits 1 when it finds problems, and calls process.exit before a pipe has
    // drained, which cut its JSON off at 64 KB. Writes to a file descriptor are
    // synchronous, so the whole report lands in the file.
    const attwOut = join(pkgRoot, "attw.json");
    const fd = openSync(attwOut, "w");
    try {
      execFileSync(join(repoRoot, "node_modules", ".bin", "attw"), attwArgs, {
        stdio: ["ignore", fd, "pipe"],
      });
    } catch {
      // Problems are read from the report below; a crash leaves it empty and fails there.
    } finally {
      closeSync(fd);
    }
    const analysis = JSON.parse(readFileSync(attwOut, "utf8")).analysis;
    const inPackage = (file) => file?.replace(`/node_modules/${name}/`, "");
    for (const problem of analysis.problems ?? []) {
      if (problem.resolutionKind === "node10") continue;
      // Resolution problems name a sub-path; file problems (such as FalseESM) name files.
      const where = problem.entrypoint
        ? `"${problem.entrypoint}" under ${problem.resolutionKind}`
        : [problem.typesFileName, problem.implementationFileName, problem.fileName]
            .filter(Boolean)
            .map(inPackage)
            .join(" for ");
      const docs = `https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/${problem.kind}.md`;
      fail(name, `attw ${problem.kind}`, `${where} (${docs})`);
    }
  }

  contents[name] = files.map(normalizeHash).sort();
  report.packages[name] = {
    version: packedManifest.version,
    tarball: relative(outDir, tarball),
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"),
    packedBytes: statSync(tarball).size,
    files: Object.fromEntries(files.map((f) => [f, statSync(join(root, f)).size])),
    seconds: (Date.now() - started) / 1000,
  };
}

// The recorded file list. A change here is expected only when the PR meant to add or
// remove a published file, and the diff shows exactly which.
if (update) {
  writeFileSync(contentsPath, `${JSON.stringify(contents, null, 2)}\n`);
  run(join(repoRoot, "node_modules", ".bin", "biome"), ["format", "--write", contentsPath]);
  console.log(`updated ${relative(repoRoot, contentsPath)}`);
} else {
  const recorded = existsSync(contentsPath) ? JSON.parse(readFileSync(contentsPath, "utf8")) : {};
  for (const name of new Set([...Object.keys(recorded), ...Object.keys(contents)])) {
    const before = new Set(recorded[name] ?? []);
    const after = new Set(contents[name] ?? []);
    const added = [...after].filter((f) => !before.has(f));
    const removed = [...before].filter((f) => !after.has(f));
    if (added.length || removed.length) {
      fail(
        name,
        "contents changed",
        [...added.map((f) => `+ ${f}`), ...removed.map((f) => `- ${f}`)].join(", ") +
          ". If intended, run `pnpm package-gate --update` and commit tools/package-gate/contents.json",
      );
    }
  }
}

report.failures = failures;
writeFileSync(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

const lines = packages.map(({ manifest }) => {
  const entry = report.packages[manifest.name];
  const own = failures.filter((f) => f.pkg === manifest.name).length;
  return `| ${manifest.name} | ${entry.version} | ${(entry.packedBytes / 1024).toFixed(1)} KB | ${Object.keys(entry.files).length} | ${own ? `❌ ${own}` : "✅"} |`;
});
const summary = [
  "### Package gate: tarball checks",
  "",
  "| Package | Version | Packed | Files | Result |",
  "|---|---|---|---|---|",
  ...lines,
  "",
  ...failures.map((f) => `- ❌ \`${f.pkg}\` **${f.check}**: ${f.detail}`),
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(`tarballs and report.json written to ${outDir}`);

if (failures.length) {
  console.error(`\npackage gate: ${failures.length} problem(s) found`);
  process.exit(1);
}
