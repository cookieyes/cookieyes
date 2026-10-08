#!/usr/bin/env node
/**
 * The canonical bundle-size measurement for the CookieYes SDK.
 *
 * Every size claim we make — in CI, in a changeset, on the docs site — comes
 * from this script. There is deliberately no second way to produce the number,
 * because two methods that disagree are worse than one method that is merely
 * imperfect.
 *
 * ## What it measures
 *
 * The **delta in compressed client JavaScript** between an empty Next.js app
 * and the same app with one CookieYes entry point mounted. The fixture apps
 * under `fixtures/` are byte-identical apart from that one component. Three of
 * them mirror consentbench's `baseline`, `with-cookieyes-core` and
 * `with-cookieyes-react` apps and one mirrors its `fair-cookieyes`, so the
 * figures are directly comparable to the published leaderboard; the
 * banner-only fixture has no counterpart there and exists because the landing
 * page quotes a figure for "the whole banner" specifically.
 *
 * Two numbers are reported per app, and both matter:
 *
 * - **initial** — the scripts the prerendered HTML actually references. This is
 *   what a first-time visitor downloads before anything is interactive, and it
 *   is the headline figure.
 * - **total** — every emitted client chunk, including ones only reachable via a
 *   dynamic import. This exists so that code-splitting cannot flatter the
 *   headline number by moving bytes rather than removing them. A split shows up
 *   as `initial` falling while `total` stays flat; a genuine deletion shows up
 *   as both falling.
 *
 * The fixed cost of the framework cancels in the subtraction, which is the
 * whole reason the measurement is a delta and not an absolute. It also means
 * incidental routes (`/_not-found`) are harmless: they are present identically
 * on both sides.
 *
 * ## Compression
 *
 * gzip at level 9 is the headline, because that is the basis consentbench
 * publishes and the basis every competitor figure on our site is quoted on.
 * Brotli is reported alongside it because that is what a CDN actually serves,
 * so it is the number a reader gets if they check with devtools. Neither is
 * "transfer size on localhost", which reads ~0 and is why the published figures
 * had to be measured by hand in the first place.
 *
 * ## Usage
 *
 *   node tools/size/measure.mjs                  # measure, print, write report
 *   node tools/size/measure.mjs --check          # also enforce budgets.json
 *   node tools/size/measure.mjs --no-build       # reuse existing .next output
 *   node tools/size/measure.mjs --out <path>     # where to write the report
 *   node tools/size/measure.mjs --fixtures <dir> # measure fixtures from elsewhere
 *   node tools/size/measure.mjs --apps k=dir,…   # measure a custom app set
 *   node tools/size/measure.mjs --base <report>  # compare against another report
 *   node tools/size/measure.mjs --comment <path> # write the pull-request comment
 *   node tools/size/measure.mjs --override <why> # accept a per-change overrun
 *
 * Or via the root package: `pnpm size`, `pnpm size:check`.
 *
 * `--no-build` reuses whatever is already in each fixture's `.next`. It is for
 * re-reading a measurement you just took, not for taking one: if the SDK or a
 * fixture changed since that build, it reports the old numbers with no warning.
 *
 * `--fixtures` and `--apps` are for one-off comparisons — a published version, or
 * a competitor — without committing a fixture for it. The first `--apps` entry
 * must be the control and must be keyed `baseline`.
 *
 * `--base` takes the base branch's committed `size-report.json`, and with it
 * `--check` also enforces the per-change limits in `budgets.json`. `--override`
 * carries the reason from a pull request labelled `size-override`; it waives
 * those per-change limits only, never the absolute budgets.
 *
 * Exit code is non-zero only under `--check`, and only when a budget or limit
 * is exceeded. Measuring never fails a build on its own.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gunzipSync, gzipSync, constants as zlibConstants } from "node:zlib";
import { packTarballs } from "../../matrix/scripts/pack-tarballs.mjs";
import { sdkFingerprint } from "./sdk-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

/**
 * The apps under measurement.
 *
 * `baseline` is the control and must stay first — every other entry is reported
 * as a delta against it. `key` is what appears in the report, in the budgets and
 * on the site, so it names the thing a reader recognises ("core", "interface")
 * rather than the directory.
 */
const DEFAULT_APPS = [
  { dir: "baseline", key: "baseline", label: "empty Next.js app (control)" },
  { dir: "with-core", key: "core", label: "@cookieyes/core — headless engine" },
  { dir: "with-react-banner", key: "banner", label: "@cookieyes/react — banner only" },
  {
    dir: "with-react",
    key: "interface",
    label: "@cookieyes/react — banner + preferences + recall",
  },
  {
    dir: "with-nextjs",
    key: "nextjs",
    label: "@cookieyes/nextjs — banner + preferences (mirrors fair-cookieyes)",
  },
  {
    dir: "with-nextjs-devtools",
    key: "devtools",
    label:
      "@cookieyes/nextjs + <CookieYesDevtools/> mounted (AD-5 / A2 — a production build must exclude the real panel)",
  },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const doBuild = !flag("--no-build");
const doCheck = flag("--check");
const outPath = resolve(opt("--out", join(HERE, "size-report.json")));
const basePath = opt("--base", null);
const commentPath = opt("--comment", null);
const overrideReason = opt("--override", null);

// `--fixtures` and `--apps` exist so that a one-off comparison — most usefully
// "what did the published versions actually measure at?" — goes through this
// exact code path instead of a throwaway script that scores itself differently.
// A number produced by a second method is not comparable to these, and that is
// the whole failure this file is meant to end.
const FIXTURES = resolve(opt("--fixtures", join(HERE, "fixtures")));
const appsSpec = opt("--apps", null);
const APPS = appsSpec
  ? appsSpec.split(",").map((pair) => {
      const [key, dir] = pair.split("=");
      if (!key || !dir) throw new Error(`--apps entries look like "key=dir"; got "${pair}"`);
      return { key, dir, label: dir };
    })
  : DEFAULT_APPS;
if (APPS[0].key !== "baseline")
  throw new Error(`the first --apps entry must be the control, keyed "baseline"`);

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

const gzip = (buf) => gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  brotliCompressSync(buf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

/**
 * Compress the concatenation, not the sum of the parts.
 *
 * Chunks are served as separate responses, so summing per-file gzip is the
 * faithful model: a shared dictionary across files is not something the browser
 * ever gets. Compressing the concatenation would quietly under-report by
 * letting one chunk's dictionary pay for another's.
 */
function measureFiles(files) {
  let raw = 0;
  let gz = 0;
  let br = 0;
  const perFile = [];
  for (const file of [...files].sort()) {
    const buf = readFileSync(file);
    const entry = {
      file: relative(FIXTURES, file),
      raw: buf.length,
      gzip: gzip(buf),
      brotli: brotli(buf),
    };
    raw += entry.raw;
    gz += entry.gzip;
    br += entry.brotli;
    perFile.push(entry);
  }
  return { raw, gzip: gz, brotli: br, files: perFile };
}

// ---------------------------------------------------------------------------
// Locating the two chunk sets
// ---------------------------------------------------------------------------

/** Every `.js` Turbopack emitted under `.next/static`, as absolute paths. */
/** Every stylesheet a fixture's build emitted, for the devtools content check. */
function emittedStylesheets(appDir) {
  const root = join(appDir, ".next", "static");
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".css")) found.push(full);
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

function emittedChunks(appDir) {
  const root = join(appDir, ".next", "static");
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      // `static/<buildId>/_buildManifest.js` and friends are per-build metadata,
      // not app code, and no App Router page references them. They are identical
      // on both sides of the subtraction, so this only affects presentation.
      else if (name.endsWith(".js") && !name.startsWith("_")) found.push(full);
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

/** Chunks a prerendered HTML file tells the browser to fetch, as absolute paths. */
function chunksReferencedBy(appDir, htmlFile) {
  const source = readFileSync(htmlFile, "utf8");
  const files = new Set();
  // `<script src>` plus the module preloads React emits — the browser fetches
  // both eagerly, so both are part of the initial download.
  for (const match of source.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+?\.js)"/g)) {
    const file = join(appDir, ".next", match[1].replace("/_next/", ""));
    if (!existsSync(file)) {
      throw new Error(`${relative(REPO, htmlFile)} references ${match[1]}, which was not emitted`);
    }
    files.add(file);
  }
  return files;
}

/** Every prerendered HTML file except the one for `/`. */
function otherRouteHtml(appDir) {
  const root = join(appDir, ".next", "server");
  const found = [];
  const indexHtml = join(root, "app", "index.html");
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html") && full !== indexHtml) found.push(full);
    }
  };
  walk(root);
  return found;
}

/**
 * The two chunk sets for an app.
 *
 * `initial` is what the prerendered HTML for `/` references. Reading the HTML
 * rather than a build manifest is deliberate: the manifest describes what the
 * bundler produced, the HTML describes what a visitor is actually told to fetch,
 * and after a dynamic-import split those two stop being the same thing.
 * Turbopack (Next 16's default) also no longer emits `app-build-manifest.json`,
 * so the HTML is the only faithful source.
 *
 * `total` is `initial` plus every chunk that no prerendered page references —
 * i.e. the ones only reachable through a dynamic `import()` at runtime. Chunks
 * belonging solely to another route are excluded, and that exclusion is
 * load-bearing rather than tidy-up: Next always generates `/_not-found`, and in
 * the control app its chunk happens to be shared with `/` while in an
 * SDK-mounted app it is not. Counting it would have shown a phantom 3.66 KB of
 * "dynamic" code in `@cookieyes/core`, which ships no dynamic import at all.
 */
function chunkSets(appDir) {
  const indexHtml = join(appDir, ".next", "server", "app", "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(
      `No prerendered HTML at ${relative(REPO, indexHtml)} — the build did not produce a static page. ` +
        `Run without --no-build, or check the build output.`,
    );
  }
  const initial = chunksReferencedBy(appDir, indexHtml);
  if (initial.size === 0)
    throw new Error(`No client scripts referenced by ${relative(REPO, indexHtml)}`);

  const claimedByOtherRoutes = new Set();
  for (const html of otherRouteHtml(appDir)) {
    for (const file of chunksReferencedBy(appDir, html)) claimedByOtherRoutes.add(file);
  }

  const total = new Set(initial);
  for (const file of emittedChunks(appDir)) {
    if (!claimedByOtherRoutes.has(file)) total.add(file);
  }
  return { initial: [...initial], total: [...total] };
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Install a fixture's dependencies from packed tarballs, the way a customer
 * installs them from npm.
 *
 * This is not a detail. The first version of this script resolved the SDK
 * through the pnpm workspace (`workspace:*`) and measured the interface layer
 * 1.18 KB *smaller* than a real install of the identical published artifact —
 * byte-identical `dist/index.js`, same Next, same React, different answer. The
 * cause: a workspace link satisfies `@cookieyes/react`'s React peer dependency
 * from `sdk/react/node_modules`, which holds its own devDependency copy of
 * React, so the bundler saw a module graph no consumer will ever have.
 *
 * `matrix/scripts/pack-tarballs.mjs` already existed for exactly this reason
 * and its header says so. Reusing it means there is one definition in the repo
 * of "installed like a consumer", not two that drift.
 *
 * ## Why `pnpm.overrides` and not just the direct dependency
 *
 * Pinning only the fixture's own dependency is not enough, and the failure is
 * silent. `pnpm pack` rewrites `@cookieyes/react`'s `"@cookieyes/core":
 * "workspace:*"` to the concrete version `0.5.0`, which pnpm then resolves
 * **from the registry** — so a fixture installing the local `react` tarball got
 * the *published* `core` underneath it. An experiment that stubbed core out
 * entirely moved the interface fixtures by exactly 0 bytes, which read as
 * "core contributes nothing to the interface layer" rather than "the tool
 * measured the wrong core".
 *
 * The overrides force every `@cookieyes/*` in the tree, at any depth, to the
 * tarball just packed. `matrix/example-app/package.json` does the same thing
 * for the same reason.
 */
function installFixture(appDir, name, tarballs) {
  const manifestPath = join(appDir, "package.json");
  const manifest = readFileSync(manifestPath, "utf8");
  const resolved = manifest
    .replace("__TARBALL_CORE__", `file:${tarballs["@cookieyes/core"]}`)
    .replace("__TARBALL_REACT__", `file:${tarballs["@cookieyes/react"]}`)
    .replace("__TARBALL_NEXTJS__", `file:${tarballs["@cookieyes/nextjs"]}`)
    .replace("__TARBALL_DEVTOOLS__", `file:${tarballs["@cookieyes/devtools"]}`);
  if (resolved.includes("__TARBALL_")) {
    throw new Error(`fixture "${name}" has an unresolved tarball placeholder in package.json`);
  }

  const withOverrides = JSON.parse(resolved);
  withOverrides.pnpm = {
    ...withOverrides.pnpm,
    overrides: Object.fromEntries(
      Object.entries(tarballs).map(([pkg, tarball]) => [pkg, `file:${tarball}`]),
    ),
  };

  // The placeholder form is what is committed, so the resolved form is written
  // only for the duration of the install and then put back. A fixture left
  // holding an absolute path from someone's laptop is a dirty diff waiting to
  // be committed by accident.
  writeFileSync(manifestPath, `${JSON.stringify(withOverrides, null, 2)}\n`);
  // pnpm treats a `file:` dependency whose specifier has not changed as already
  // resolved, and these tarballs are repacked with different contents under the
  // same name on every run. Left in place, the lockfile pins the previous run's
  // tarball and the fixture installs stale code — which is how a stubbed-out
  // core measured as a 0-byte saving. The tarball directory is also
  // content-hashed (see the caller) so the specifier itself changes.
  rmSync(join(appDir, "pnpm-lock.yaml"), { force: true });
  try {
    const result = spawnSync(
      "pnpm",
      [
        "install",
        // The fixtures deliberately sit outside the workspace; see above.
        "--ignore-workspace",
        "--no-frozen-lockfile",
        "--silent",
      ],
      { cwd: appDir, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
    );
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      throw new Error(`pnpm install failed for fixture "${name}"`);
    }
  } finally {
    writeFileSync(manifestPath, manifest);
  }

  // Both of the ways this measurement has already been silently wrong are
  // asserted here rather than trusted: a second copy of React in the graph, and
  // any `@cookieyes/*` resolved from the registry instead of the local tarball.
  // Each produced a plausible-looking number that described the wrong code.
  const pnpmDir = join(appDir, "node_modules", ".pnpm");
  const fromRegistry = [];
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      // A tarball install is named `@cookieyes+react@file+...`; a registry
      // install is named `@cookieyes+core@0.5.0`.
      if (entry.startsWith("@cookieyes+") && !entry.includes("@file+")) {
        fromRegistry.push(entry.split("_")[0]);
      }
    }
  }
  if (fromRegistry.length > 0) {
    throw new Error(
      `fixture "${name}" resolved ${fromRegistry.join(", ")} from the registry rather than ` +
        `the freshly packed tarball. It would measure published code, not this working tree.`,
    );
  }

  // The decisive check, and the only one that catches a *stale* tarball rather
  // than a wrong one: whatever got installed must be byte-identical to what
  // `pnpm build` just produced. Everything above is a proxy for this; this is
  // the invariant. Without it, `file:` resolution caching silently measured a
  // previous run's code and reported a real change as a 0-byte saving.
  for (const pkg of ["core", "react", "nextjs", "scripts", "devtools"]) {
    const built = join(REPO, "sdk", pkg, "dist", "index.js");
    const installed = join(appDir, "node_modules", "@cookieyes", pkg, "dist", "index.js");
    if (!existsSync(installed) || !existsSync(built)) continue;
    if (!readFileSync(installed).equals(readFileSync(built))) {
      throw new Error(
        `fixture "${name}" installed a @cookieyes/${pkg} that differs from sdk/${pkg}/dist. ` +
          `The measurement would describe stale code. Delete ` +
          `tools/size/fixtures/*/node_modules and re-run.`,
      );
    }
  }

  const seen = new Set();
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      const match = /^react@(\d+\.\d+\.\d+)/.exec(entry);
      if (match) seen.add(match[1]);
    }
  }
  if (seen.size > 1) {
    throw new Error(
      `fixture "${name}" resolved ${seen.size} copies of React (${[...seen].join(", ")}). ` +
        `The delta would measure that duplication, not the SDK.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(appDir, name) {
  rmSync(join(appDir, ".next"), { recursive: true, force: true });
  const started = Date.now();
  const result = spawnSync("npx", ["next", "build"], {
    cwd: appDir,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: {
      ...process.env,
      // Telemetry writes to the build output and has been known to vary it.
      NEXT_TELEMETRY_DISABLED: "1",
      // A fixed NODE_ENV keeps the minifier settings identical run to run.
      NODE_ENV: "production",
    },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`next build failed for fixture "${name}"`);
  }
  return Date.now() - started;
}

// ---------------------------------------------------------------------------
// Tarballs
// ---------------------------------------------------------------------------

/** The packages whose tarballs are reported and held to the growth limit. */
const TARBALL_PACKAGES = ["@cookieyes/core", "@cookieyes/react", "@cookieyes/nextjs"];

/** Bytes of file content inside a `.tgz`, read from the tar headers. */
function unpackedSize(tgz) {
  const tar = gunzipSync(tgz);
  let total = 0;
  for (let at = 0; at + 512 <= tar.length; ) {
    const header = tar.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(header.toString("latin1", 124, 136).replace(/\0.*$/, ""), 8) || 0;
    // Regular files only: pax headers carry metadata, not shipped content.
    const type = header[156];
    if (type === 0x30 || type === 0) total += size;
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return total;
}

/**
 * What each package costs to download from npm, and what installing it costs
 * once its own `@cookieyes/*` dependencies come along with it.
 *
 * `install` is the figure a reader means by "how much does this pull in": the
 * React adapter alone is small, but nobody installs it without core. Peer
 * dependencies (React, Next) are left out because the consumer already has
 * them, and every runtime dependency of these packages is a `@cookieyes/*`
 * package, so the sum is the whole install.
 */
function tarballReport(packed) {
  const own = {};
  const deps = {};
  for (const [name, file] of Object.entries(packed)) {
    const buf = readFileSync(file);
    own[name] = { packed: buf.length, unpacked: unpackedSize(buf) };
    const manifest = join(REPO, "sdk", name.split("/")[1], "package.json");
    deps[name] = Object.keys(JSON.parse(readFileSync(manifest, "utf8")).dependencies ?? {});
  }
  const report = {};
  for (const name of TARBALL_PACKAGES) {
    const closure = new Set([name]);
    for (const pkg of closure) {
      for (const dep of deps[pkg] ?? []) {
        if (!own[dep]) throw new Error(`${pkg} depends on ${dep}, which was not packed`);
        closure.add(dep);
      }
    }
    const included = [...closure];
    report[name] = {
      ...own[name],
      install: {
        packages: included,
        packed: included.reduce((sum, pkg) => sum + own[pkg].packed, 0),
        unpacked: included.reduce((sum, pkg) => sum + own[pkg].unpacked, 0),
      },
    };
  }
  return report;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const kb = (bytes) => bytes / 1024;
const fmtKb = (bytes) => `${kb(bytes).toFixed(2)} KB`;
const signedKb = (bytes) => `${bytes >= 0 ? "+" : "−"}${Math.abs(kb(bytes)).toFixed(2)} KB`;

const measured = {};

// Packing needs `dist/`, so a stale or missing build would silently measure the
// wrong code. packTarballs() throws on a missing dist/, which is the check.
let tarballs = null;
if (doBuild) {
  const root = join(HERE, ".tarballs");
  rmSync(root, { recursive: true, force: true });
  process.stderr.write("packing SDK tarballs … ");
  // Pack into a directory named for the contents of the SDK being packed.
  // pnpm keys a `file:` dependency on its specifier, so a path that never
  // changes lets it reuse the previous run's resolution even though the tarball
  // at that path is different. Putting the content hash in the path makes the
  // specifier change whenever the code does.
  const stamp = createHash("sha256");
  for (const pkg of ["core", "react", "nextjs", "scripts", "test", "devtools"]) {
    const dist = join(REPO, "sdk", pkg, "dist", "index.js");
    if (existsSync(dist)) stamp.update(readFileSync(dist));
  }
  const tarballDir = join(root, stamp.digest("hex").slice(0, 16));
  tarballs = packTarballs(tarballDir);
  process.stderr.write("done\n");
}

for (const app of APPS) {
  const appDir = join(FIXTURES, app.dir);
  if (!existsSync(appDir)) throw new Error(`Missing fixture: ${relative(REPO, appDir)}`);
  if (doBuild) {
    process.stderr.write(`installing ${app.dir} … `);
    installFixture(appDir, app.dir, tarballs);
    process.stderr.write("building … ");
    const ms = build(appDir, app.dir);
    process.stderr.write(`${(ms / 1000).toFixed(1)}s\n`);
  }
  const sets = chunkSets(appDir);
  measured[app.key] = {
    label: app.label,
    fixture: relative(REPO, appDir),
    initial: measureFiles(sets.initial),
    total: measureFiles(sets.total),
  };
}

const base = measured.baseline;

/** The published figure for an app: its compressed client JS over the control. */
function delta(app) {
  return {
    initial: {
      raw: app.initial.raw - base.initial.raw,
      gzip: app.initial.gzip - base.initial.gzip,
      brotli: app.initial.brotli - base.initial.brotli,
    },
    total: {
      raw: app.total.raw - base.total.raw,
      gzip: app.total.gzip - base.total.gzip,
      brotli: app.total.brotli - base.total.brotli,
    },
  };
}

const deltas = {};
for (const app of APPS) {
  if (app.key === "baseline") continue;
  deltas[app.key] = delta(measured[app.key]);
}

// The interface layer's cost *on top of* the engine — the number Story 2 of
// DEVP-62 calls the "interface delta", and the one the /improve page quotes as
// "~9 KB". Reported explicitly so nobody has to subtract by hand and get it
// wrong in a different way each time.
const interfaceOverCore =
  deltas.interface && deltas.core
    ? {
        initial: {
          gzip: deltas.interface.initial.gzip - deltas.core.initial.gzip,
          brotli: deltas.interface.initial.brotli - deltas.core.initial.brotli,
        },
        total: {
          gzip: deltas.interface.total.gzip - deltas.core.total.gzip,
          brotli: deltas.interface.total.brotli - deltas.core.total.brotli,
        },
      }
    : null;

// The stylesheet is not client JS and is not part of any delta above, but a
// real consumer does ship it, so leaving it unmeasured would be a gap someone
// eventually fills with a guess.
function stylesheet() {
  const dist = join(REPO, "sdk", "react", "dist");
  const out = {};
  for (const name of ["styles.css", "critical.css"]) {
    const file = join(dist, name);
    if (!existsSync(file)) continue;
    const buf = readFileSync(file);
    out[name] = { raw: buf.length, gzip: gzip(buf), brotli: brotli(buf) };
  }
  return out;
}

const versions = {};
for (const pkg of ["core", "react", "nextjs"]) {
  const manifest = join(REPO, "sdk", pkg, "package.json");
  if (existsSync(manifest)) {
    const json = JSON.parse(readFileSync(manifest, "utf8"));
    versions[json.name] = json.version;
  }
}

const report = {
  $schema: "./size-report.schema.json",
  method: {
    document: "tools/size/README.md",
    summary:
      "Delta in compressed client JavaScript between an empty Next.js app and the same app " +
      "with one CookieYes entry mounted. gzip level 9 is the headline basis; brotli quality 11 " +
      "is reported alongside. 'initial' counts only scripts the prerendered HTML references; " +
      "'total' counts every emitted client chunk including dynamic ones.",
    compression: { headline: "gzip", gzipLevel: 9, brotliQuality: 11 },
    next: "16.3.0",
    react: "19.2.8",
  },
  measuredAt: new Date().toISOString(),
  node: process.version,
  versions,
  /**
   * Hash of everything that determines these figures — sources, Rollup configs,
   * bundle-affecting manifest fields. The docs site refuses to publish a figure
   * whose fingerprint no longer matches the tree. Version numbers are recorded
   * above for information only; they are pointedly not part of this hash. See
   * sdk-fingerprint.mjs.
   */
  sdkFingerprint: sdkFingerprint(),
  apps: measured,
  deltas,
  interfaceOverCore,
  stylesheet: stylesheet(),
  // Only when this run packed them: `--no-build` re-reads fixtures and packs nothing.
  ...(tarballs ? { tarballs: tarballReport(tarballs) } : {}),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const lines = [];
lines.push("");
lines.push("Compressed client-JS delta over an empty Next.js app");
lines.push("─".repeat(78));
lines.push(
  `${"".padEnd(24)}${"initial (gzip)".padStart(17)}${"total (gzip)".padStart(17)}${"initial (br)".padStart(17)}`,
);
for (const app of APPS) {
  if (app.key === "baseline") continue;
  const d = deltas[app.key];
  lines.push(
    app.key.padEnd(24) +
      fmtKb(d.initial.gzip).padStart(17) +
      fmtKb(d.total.gzip).padStart(17) +
      fmtKb(d.initial.brotli).padStart(17),
  );
}
if (interfaceOverCore) {
  lines.push(
    "interface − core".padEnd(24) +
      fmtKb(interfaceOverCore.initial.gzip).padStart(17) +
      fmtKb(interfaceOverCore.total.gzip).padStart(17) +
      fmtKb(interfaceOverCore.initial.brotli).padStart(17),
  );
}
lines.push("─".repeat(78));
lines.push(`control: ${fmtKb(base.initial.gzip)} initial / ${fmtKb(base.total.gzip)} total (gzip)`);
const css = report.stylesheet;
if (css["styles.css"]) {
  lines.push(
    `stylesheet (not in the JS delta): styles.css ${fmtKb(css["styles.css"].gzip)}` +
      (css["critical.css"] ? `, critical.css ${fmtKb(css["critical.css"].gzip)}` : ""),
  );
}
for (const [name, t] of Object.entries(report.tarballs ?? {})) {
  lines.push(
    `${name}: tarball ${fmtKb(t.packed)}, unpacked ${fmtKb(t.unpacked)}; ` +
      `install ${fmtKb(t.install.packed)} (${t.install.packages.length} packages)`,
  );
}
lines.push(`report: ${relative(REPO, outPath)}`);
lines.push("");
process.stdout.write(`${lines.join("\n")}\n`);

// ---------------------------------------------------------------------------
// Budgets (--check) and the change against the base branch (--base)
// ---------------------------------------------------------------------------

if (!doCheck && !commentPath) process.exit(0);

const budgetPath = join(HERE, "budgets.json");
if (!existsSync(budgetPath)) {
  process.stderr.write(`--check needs ${relative(REPO, budgetPath)}, which does not exist\n`);
  process.exit(1);
}
const budgets = JSON.parse(readFileSync(budgetPath, "utf8"));

const failures = [];
const notes = [];

for (const [key, budget] of Object.entries(budgets.budgets)) {
  // `$`-prefixed keys are the file's documentation convention, not apps.
  if (key.startsWith("$")) continue;
  const d = deltas[key];
  if (!d) {
    failures.push(`budget "${key}" names an app that was not measured`);
    continue;
  }
  for (const scope of ["initial", "total"]) {
    const limit = budget[scope];
    if (limit == null) continue;
    const actual = d[scope][budgets.basis ?? "gzip"];
    const headroom = limit - actual;
    const line = `${key}.${scope}: ${fmtKb(actual)} against a ${fmtKb(limit)} budget (${signedKb(headroom)} headroom)`;
    if (headroom < 0) failures.push(line);
    else notes.push(line);
  }
}

// A2 item 2 (design doc §0): the real proof that the production bundle
// contains NONE of the real devtools panel's code — not just that its byte
// delta is small (a small delta could still mean partial, dead-but-present
// code). Distinctive strings that only exist in the real panel's module graph
// (never in the stub) must be absent from every emitted JS chunk of the
// devtools fixture's production build.
const DEVTOOLS_REAL_PANEL_MARKERS = [
  "__COOKIEYES_DEVTOOLS_REAL__",
  "cyd-trigger",
  "cyd-tablist",
  "data-cyd-part",
  "Google Consent Mode",
];

if (measured.devtools) {
  const devtoolsAppDir = join(FIXTURES, "with-nextjs-devtools");
  const devtoolsSets = chunkSets(devtoolsAppDir);
  // Stylesheets too: the docs have users import `@cookieyes/devtools/styles.css`,
  // and an unconditional export once shipped the whole panel stylesheet to
  // production while the JS check above stayed green.
  const allChunks = new Set([
    ...devtoolsSets.initial,
    ...devtoolsSets.total,
    ...emittedStylesheets(devtoolsAppDir),
  ]);
  for (const file of allChunks) {
    const source = readFileSync(file, "utf8");
    for (const marker of DEVTOOLS_REAL_PANEL_MARKERS) {
      if (source.includes(marker)) {
        failures.push(
          `devtools content check: chunk "${relative(REPO, file)}" contains the real panel's ` +
            `marker string "${marker}" — the production build did not exclude @cookieyes/devtools' ` +
            `real entry (AD-1 / A2 item 2).`,
        );
      }
    }
  }
  if (!allChunks.size) {
    failures.push(
      "devtools content check: no chunks were found to check — the fixture may not have built",
    );
  }
}

// The change against the previous release, so slow creep is visible rather than
// only a threshold breach. `previous` is written by the release process; when it
// is absent this is a first run and there is nothing to compare against yet.
if (budgets.previous) {
  for (const [key, prev] of Object.entries(budgets.previous)) {
    if (key.startsWith("$")) continue;
    const d = deltas[key];
    if (!d) continue;
    for (const scope of ["initial", "total"]) {
      if (prev[scope] == null) continue;
      const change = d[scope][budgets.basis ?? "gzip"] - prev[scope];
      notes.push(`${key}.${scope}: ${signedKb(change)} against the previous release`);
    }
  }
}

// ---------------------------------------------------------------------------
// Per-change limits (--base)
// ---------------------------------------------------------------------------

const basis = budgets.basis ?? "gzip";
const baseReport = basePath ? JSON.parse(readFileSync(resolve(basePath), "utf8")) : null;
// A matching fingerprint means this tree builds the same SDK the base report
// measured. The fresh figures can still differ by a few bytes, because the base
// report was measured on a contributor's machine and this one on a CI runner;
// that is not a change, and reporting it as one would make "nothing changed"
// impossible to say.
const sdkUnchanged = baseReport?.sdkFingerprint === report.sdkFingerprint;

/** Growth of one app scope against the base report, or null if it has no figure. */
function appChange(key, scope) {
  const before = baseReport?.deltas?.[key]?.[scope]?.[basis];
  if (before == null) return null;
  return sdkUnchanged ? 0 : deltas[key][scope][basis] - before;
}

/** Growth of one tarball field against the base report, or null if it has no figure. */
function tarballChange(name, field) {
  const before = baseReport?.tarballs?.[name];
  const now = report.tarballs?.[name];
  if (!before || !now) return null;
  // `pnpm pack` does not compress byte-for-byte reproducibly: packing the same
  // files twice has differed by a byte. Unchanged contents are no change.
  if (field === "install") {
    return now.install.unpacked === before.install.unpacked
      ? 0
      : now.install.packed - before.install.packed;
  }
  if (field === "packed" && now.unpacked === before.unpacked) return 0;
  return now[field] - before[field];
}

const overruns = [];
const perChange = budgets.perChange ?? {};
if (baseReport) {
  for (const [key, limit] of Object.entries(perChange.apps ?? {})) {
    if (key.startsWith("$")) continue;
    for (const scope of ["initial", "total"]) {
      const change = limit[scope] == null ? null : appChange(key, scope);
      if (change != null && change > limit[scope]) {
        overruns.push(
          `${key}.${scope} grew ${signedKb(change)}, over the ${fmtKb(limit[scope])} per-change limit`,
        );
      }
    }
  }
  if (!baseReport.tarballs) {
    notes.push("the base report has no tarball figures yet, so the tarball limit was not applied");
  } else if (!report.tarballs) {
    notes.push("this run packed no tarballs (--no-build), so the tarball limit was not applied");
  } else if (perChange.tarballGrowth != null) {
    for (const name of TARBALL_PACKAGES) {
      const change = tarballChange(name, "packed");
      const before = baseReport.tarballs[name]?.packed;
      if (change == null || !before) continue;
      if (change / before > perChange.tarballGrowth) {
        overruns.push(
          `${name} tarball grew ${(100 * (change / before)).toFixed(1)}%, over the ` +
            `${(100 * perChange.tarballGrowth).toFixed(0)}% per-change limit`,
        );
      }
    }
  }
}

// The override waives the per-change limits and nothing else. An absolute
// budget is raised in budgets.json, with its reason, in the same change.
const overrideGiven = overrideReason != null && overrideReason.trim() !== "";
if (overruns.length > 0) {
  if (overrideGiven) {
    for (const overrun of overruns) notes.push(`${overrun} (overridden: ${overrideReason.trim()})`);
  } else {
    failures.push(...overruns);
    if (overrideReason != null) {
      failures.push(
        `the size-override label is set, but the pull request description has no ` +
          `"Size override: <reason>" line`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Pull-request comment (--comment)
// ---------------------------------------------------------------------------

const fmtChange = (bytes) => {
  if (bytes == null) return "n/a";
  if (bytes === 0) return "0";
  const sign = bytes > 0 ? "+" : "−";
  return Math.abs(bytes) < 1024 ? `${sign}${Math.abs(bytes)} B` : signedKb(bytes);
};

function commentMarkdown() {
  const out = ["## Bundle size", ""];
  const appKeys = APPS.map((app) => app.key).filter((key) => key !== "baseline");
  const changes = [
    ...appKeys.flatMap((key) => [appChange(key, "initial"), appChange(key, "total")]),
    ...TARBALL_PACKAGES.flatMap((name) => [
      tarballChange(name, "packed"),
      tarballChange(name, "unpacked"),
    ]),
  ];
  // A figure the base report lacks is unknown, not unchanged.
  const nothingChanged = baseReport && changes.every((change) => change === 0);

  if (failures.length > 0) {
    out.push("**Over the limit. This blocks the merge.**", "");
    for (const failure of failures) out.push(`- ${failure}`);
    out.push(
      "",
      "A deliberate increase to a per-change limit can be accepted: a maintainer adds the " +
        "`size-override` label and the description gets a line `Size override: <reason>`. " +
        "An absolute budget is raised in `tools/size/budgets.json` instead, with its reason.",
    );
  } else if (overruns.length > 0) {
    out.push("**Over the per-change limit, overridden.**", "");
    for (const overrun of overruns) out.push(`- ${overrun}`);
    out.push("", `> Size override: ${overrideReason.trim()}`);
  } else if (!baseReport) {
    out.push("**Within all budgets.** No base report was available to compare against.");
  } else if (nothingChanged) {
    out.push(
      "**No size change.** Every bundle and package is the same size as on the base branch.",
    );
  } else {
    out.push("**Within all limits.**");
  }

  out.push(
    "",
    "Compressed client JavaScript (gzip -9) that each entry point adds to an empty Next.js app, " +
      "compared with the base branch's committed `size-report.json`. Only scripts the page loads " +
      "up front count as **initial**: code moved behind a lazy `import()` leaves initial but stays " +
      "in **total**, so a move is not reported as a saving. " +
      "[How this is measured](https://github.com/cookieyes/cookieyes/blob/main/tools/size/README.md)",
  );
  if (baseReport && !baseReport.tarballs) {
    out.push(
      "",
      "The base branch's report has no package figures yet, so package changes show n/a and " +
        "the tarball limit was not applied.",
    );
  }
  if (baseReport && sdkUnchanged) {
    out.push(
      "",
      "The SDK sources match the base branch (same fingerprint), so bundle changes are reported as 0.",
    );
  }

  const detail = [
    "",
    "| entry point | initial | change | total | change | per-change limit |",
    "|---|--:|--:|--:|--:|--:|",
  ];
  for (const key of appKeys) {
    const limit = perChange.apps?.[key]?.initial;
    detail.push(
      `| ${key} | ${fmtKb(deltas[key].initial[basis])} | ${fmtChange(appChange(key, "initial"))} | ` +
        `${fmtKb(deltas[key].total[basis])} | ${fmtChange(appChange(key, "total"))} | ` +
        `${limit == null ? "" : fmtKb(limit)} |`,
    );
  }
  if (report.tarballs) {
    detail.push(
      "",
      `What installing each package downloads from npm. **install** adds its \`@cookieyes/*\` ` +
        `dependencies; each tarball may grow at most ` +
        `${(100 * (perChange.tarballGrowth ?? 0)).toFixed(0)}% per change.`,
      "",
      "| package | tarball | change | unpacked | change | install | change |",
      "|---|--:|--:|--:|--:|--:|--:|",
    );
    for (const name of TARBALL_PACKAGES) {
      const t = report.tarballs[name];
      detail.push(
        `| \`${name}\` | ${fmtKb(t.packed)} | ${fmtChange(tarballChange(name, "packed"))} | ` +
          `${fmtKb(t.unpacked)} | ${fmtChange(tarballChange(name, "unpacked"))} | ` +
          `${fmtKb(t.install.packed)} | ${fmtChange(tarballChange(name, "install"))} |`,
      );
    }
  }
  // Nothing to look at when nothing moved, but the figures stay one click away.
  if (nothingChanged)
    out.push("", "<details><summary>Figures</summary>", ...detail, "", "</details>");
  else out.push(...detail);
  return `${out.join("\n")}\n`;
}

if (commentPath) {
  mkdirSync(dirname(resolve(commentPath)), { recursive: true });
  writeFileSync(resolve(commentPath), commentMarkdown());
}

for (const note of notes) process.stdout.write(`  ${note}\n`);
if (!doCheck) process.exit(0);
if (failures.length > 0) {
  process.stderr.write(
    `\nSize budget exceeded:\n${failures.map((f) => `  ✗ ${f}`).join("\n")}\n\n`,
  );
  process.stderr.write(
    "Budgets are in tools/size/budgets.json. Raising one is a deliberate decision that\n" +
      "belongs in the same change as the growth, with a reason, not a fix for a red build.\n" +
      "A per-change limit is waived only by the size-override label with a written reason.\n",
  );
  process.exit(1);
}
process.stdout.write("\nAll size budgets met.\n");
