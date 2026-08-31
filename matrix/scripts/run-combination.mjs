#!/usr/bin/env node
// matrix/scripts/run-combination.mjs
//
// Orchestrates one matrix combination end-to-end: scaffold -> install ->
// (dynamic) type-package check -> typecheck -> build -> SSR assert (Test A)
// -> jsdom behaviour (Test B). Writes matrix/results/<id>.json, matching
// matrix-results.schema.json's `combinationResult` shape exactly (§8).
//
// D2 — isolated installs: each combination gets its own scratch directory
// (`$RUNNER_TEMP/peer-matrix/<combo-id>/`, falling back to the OS temp dir
// locally) with its own node_modules and its own generated lockfile,
// installed with `pnpm install --ignore-workspace --no-frozen-lockfile`.
// Nothing here touches the repo's own node_modules or lockfile.
//
// A leg failing at any step never throws past this file — every step and
// assertion outcome is recorded, and the process always writes a result file
// and exits 0 (the *combination* fails; the *script* didn't crash). CI reads
// the result file's `outcome` to decide pass/fail, matching §5.4's "does not
// throw past run-combination.mjs" requirement for Test A, applied uniformly
// to every step.
//
// Usage:
//   node matrix/scripts/run-combination.mjs --combo=<id> [--tarballs=<path.json>] \
//     [--tarballs-dir=<dir>] [--logs-artifact=<value>]
// `--tarballs` points at a JSON manifest ({ "@cookieyes/x": "/abs/path" })
// like pack-tarballs.mjs prints to stdout; `--tarballs-dir` instead rebuilds
// that manifest by filename convention from a directory of .tgz files —
// what CI's `run` job uses after downloading the `build-sdk` job's tarball
// artifact onto a different runner (the absolute paths in a JSON manifest
// produced there wouldn't resolve here). If neither is given, tarballs are
// packed fresh (useful for a local, single-combination run).

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { majorsMatch, readResolvedVersion } from "./lib/versions.mjs";
import { packTarballs, resolveTarballsFromDir } from "./pack-tarballs.mjs";
import { scaffoldExampleApp } from "./scaffold-example-app.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const resultsDir = join(repoRoot, "matrix", "results");
const SERVER_PORT = 4100;
const SERVER_READY_TIMEOUT_MS = 60_000;

/** Maps vitest's test titles to the results schema's stable assertion names. */
const JSDOM_ASSERTION_NAME_MAP = {
  "Slot asChild forwards a real ref to the child DOM node":
    "asChild-ref-populated-with-real-dom-node",
  "Slot asChild composes the outer ref with the child's own ref":
    "asChild-outer-and-inner-ref-composed",
};

function nowIso() {
  return new Date().toISOString();
}

function scratchRoot() {
  const base = process.env.RUNNER_TEMP ?? tmpdir();
  return join(base, "peer-matrix");
}

/** Runs a command, capturing combined output; never throws — returns { ok, output }. */
function run(cmd, args, options) {
  try {
    const output = execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    return { ok: true, output };
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n");
    return { ok: false, output: output || String(error.message ?? error) };
  }
}

function appendLog(logPath, heading, text) {
  mkdirSync(dirname(logPath), { recursive: true });
  const block = `\n===== ${heading} =====\n${text}\n`;
  writeFileSync(logPath, block, { flag: "a" });
}

/** Polls `http://localhost:<port>/` until it responds or the timeout elapses. */
async function waitForServer(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status < 500) return true;
    } catch {
      // Not up yet — keep polling.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Tears down the `next start` server tree.
 *
 * `pnpm run start` is a wrapper: it spawns `next start` as its own child, so
 * signalling only the direct child left `next-server` orphaned, still holding
 * this process's stdout/stderr pipes open. Node then kept its event loop alive
 * and the job hung after every step had already passed — 37s of work followed
 * by an 18-minute stall, ended only by the runner's own orphan cleanup. So:
 * drop the pipes, signal the whole process group (negative pid, available
 * because the child was spawned `detached`), and escalate to SIGKILL if the
 * group ignores SIGTERM.
 */
function killProcessTree(child) {
  if (!child) return;
  // Release the pipes first — this alone is what unblocks process exit.
  child.stdout?.destroy();
  child.stderr?.destroy();
  if (child.killed || child.exitCode !== null) return;

  const signalGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
      return true;
    } catch {
      return false;
    }
  };

  if (!signalGroup("SIGTERM")) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Already gone.
    }
  }

  // Don't hold the event loop open waiting for the escalation timer, or for
  // the child itself, if the group is slow to die.
  const escalation = setTimeout(() => signalGroup("SIGKILL"), 5_000);
  escalation.unref();
  child.unref();
}

/** Runs the jsdom behaviour test (Test B) via vitest's JSON reporter, mapped to named assertions. */
function runJsdomBehaviour(appDir, logPath) {
  const outputFile = join(appDir, ".vitest-behaviour-results.json");
  const result = run(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--config",
      "tests/vitest.config.mts",
      "--reporter=json",
      `--outputFile=${outputFile}`,
    ],
    { cwd: appDir },
  );
  appendLog(logPath, "jsdomBehaviour (test:behaviour)", result.output);

  const knownAssertionNames = Object.values(JSDOM_ASSERTION_NAME_MAP);
  if (!existsSync(outputFile)) {
    return {
      outcome: "fail",
      assertions: knownAssertionNames.map((name) => ({ name, outcome: "fail" })),
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(outputFile, "utf8"));
    const assertionResults = (parsed.testResults ?? []).flatMap((f) => f.assertionResults ?? []);
    const assertions = assertionResults.map((a) => ({
      name: JSDOM_ASSERTION_NAME_MAP[a.title] ?? a.fullName ?? a.title,
      outcome: a.status === "passed" ? "pass" : "fail",
    }));
    const outcome =
      assertions.length > 0 && assertions.every((a) => a.outcome === "pass") ? "pass" : "fail";
    return { outcome, assertions };
  } catch {
    return {
      outcome: "fail",
      assertions: knownAssertionNames.map((name) => ({ name, outcome: "fail" })),
    };
  }
}

/**
 * @param {{ id: string, resultsOverride?: object }} params
 */
export async function runCombination({ comboId, tarballsPath, tarballsDir, logsArtifact }) {
  const { combinations } = await import("../matrix.config.mjs");
  const combo = combinations.find((c) => c.id === comboId);
  if (!combo) {
    throw new Error(`[run-combination] Unknown combination id "${comboId}".`);
  }

  const startedAt = nowIso();
  const startedAtMs = Date.now();
  const comboScratchDir = join(scratchRoot(), comboId);
  const appDir = join(comboScratchDir, "app");
  const logPath = join(resultsDir, "logs", `${comboId}.log`);
  rmSync(logPath, { force: true });

  const steps = {
    install: { outcome: "skipped" },
    typePackageCheck: { outcome: "skipped" },
    typecheck: { outcome: "skipped" },
    build: { outcome: "skipped" },
    ssrRender: { outcome: "skipped", assertions: [] },
    jsdomBehaviour: { outcome: "skipped", assertions: [] },
  };
  let notes = null;
  let serverProcess;

  try {
    // --- scaffold + tarballs -------------------------------------------------
    let tarballs;
    if (tarballsPath) {
      tarballs = JSON.parse(readFileSync(tarballsPath, "utf8"));
    } else if (tarballsDir) {
      tarballs = resolveTarballsFromDir(tarballsDir);
    } else {
      tarballs = packTarballs(join(comboScratchDir, "tarballs"));
    }
    scaffoldExampleApp({ combo, tarballs, targetDir: appDir });

    // --- install (D2: --ignore-workspace, fresh scratch node_modules) -------
    const install = run("pnpm", ["install", "--ignore-workspace", "--no-frozen-lockfile"], {
      cwd: appDir,
    });
    appendLog(logPath, "install", install.output);
    steps.install.outcome = install.ok ? "pass" : "fail";
    if (!install.ok) {
      notes = "install step failed — see logsArtifact.";
      return finalize();
    }

    // --- dynamic type-package check (§5.4 — the false-pass trap) ------------
    const nodeModules = join(appDir, "node_modules");
    // Schema requires strings — "" means "not resolvable on disk", never `null`.
    const resolved = {
      next: readResolvedVersion(nodeModules, "next") ?? "",
      react: readResolvedVersion(nodeModules, "react") ?? "",
      reactDom: readResolvedVersion(nodeModules, "react-dom") ?? "",
      typesReact: readResolvedVersion(nodeModules, "@types/react") ?? "",
      typesReactDom: readResolvedVersion(nodeModules, "@types/react-dom") ?? "",
    };

    const reactTypesOk = resolved.typesReact
      ? majorsMatch(resolved.react ?? "", resolved.typesReact)
      : false;
    const reactDomTypesOk = resolved.typesReactDom
      ? majorsMatch(resolved.reactDom ?? "", resolved.typesReactDom)
      : false;

    if (!reactTypesOk || !reactDomTypesOk) {
      steps.typePackageCheck.outcome = "fail";
      const mismatch = !reactTypesOk
        ? `resolved @types/react major (${resolved.typesReact}) does not match resolved react major (${resolved.react})`
        : `resolved @types/react-dom major (${resolved.typesReactDom}) does not match resolved react-dom major (${resolved.reactDom})`;
      notes = `${mismatch} — matrix.config.mjs typesReact/typesReactDom range is wrong.`;
      appendLog(logPath, "typePackageCheck", notes);
      return finalize(resolved);
    }
    steps.typePackageCheck.outcome = "pass";

    // --- typecheck (a real tsc --noEmit — a build alone can't be trusted; §1) -
    const typecheck = run("pnpm", ["run", "typecheck"], { cwd: appDir });
    appendLog(logPath, "typecheck", typecheck.output);
    steps.typecheck.outcome = typecheck.ok ? "pass" : "fail";
    if (!typecheck.ok) {
      notes = "typecheck step failed — see logsArtifact.";
      return finalize(resolved);
    }

    // --- build ----------------------------------------------------------------
    const build = run("pnpm", ["run", "build"], { cwd: appDir });
    appendLog(logPath, "build", build.output);
    steps.build.outcome = build.ok ? "pass" : "fail";
    if (!build.ok) {
      notes = "build step failed — see logsArtifact.";
      return finalize(resolved);
    }

    // --- SSR render (Test A) ---------------------------------------------------
    serverProcess = spawn("pnpm", ["run", "start"], {
      cwd: appDir,
      stdio: ["ignore", "pipe", "pipe"],
      // Process-group leader, so killProcessTree can signal `next start` too
      // and not just the `pnpm run start` wrapper — see there for why.
      detached: true,
    });
    let serverLog = "";
    serverProcess.stdout?.on("data", (d) => {
      serverLog += d.toString();
    });
    serverProcess.stderr?.on("data", (d) => {
      serverLog += d.toString();
    });

    const ready = await waitForServer(SERVER_PORT, SERVER_READY_TIMEOUT_MS);
    appendLog(logPath, "next start", serverLog);
    if (!ready) {
      steps.ssrRender.outcome = "fail";
      notes = `next start did not become ready on port ${SERVER_PORT} within ${SERVER_READY_TIMEOUT_MS}ms.`;
      return finalize(resolved);
    }

    const { runSsrAssertions } = await import(join(appDir, "tests", "ssr.assert.mjs"));
    const ssrResult = await runSsrAssertions({ baseUrl: `http://localhost:${SERVER_PORT}/` });
    steps.ssrRender = { outcome: ssrResult.outcome, assertions: ssrResult.assertions };
    if (ssrResult.notes) notes = ssrResult.notes;

    killProcessTree(serverProcess);
    serverProcess = undefined;

    if (ssrResult.outcome !== "pass") {
      return finalize(resolved);
    }

    // --- jsdom behaviour (Test B) -----------------------------------------------
    const jsdomResult = runJsdomBehaviour(appDir, logPath);
    steps.jsdomBehaviour = jsdomResult;

    return finalize(resolved);

    function finalize(resolvedVersions) {
      const finishedAt = nowIso();
      // A "skipped" step only ever happens on an early return (a prior step
      // failed), so this is equivalent to "every step actually ran and
      // passed" — never silently treats an unattempted step as a pass.
      const outcome = Object.values(steps).every((s) => s.outcome === "pass") ? "pass" : "fail";

      const result = {
        id: combo.id,
        role: combo.role,
        label: combo.label,
        packagesUnderTest: combo.packagesUnderTest,
        requested: combo.versions,
        // Schema requires strings (matrix-results.schema.json); an empty
        // string means "install never completed, so nothing was resolved
        // yet" — distinguishable from a real resolved version, never `null`.
        resolved: resolvedVersions ?? {
          next: "",
          react: "",
          reactDom: "",
          typesReact: "",
          typesReactDom: "",
        },
        node: combo.node,
        packageManager: combo.packageManager,
        moduleResolution: combo.moduleResolution,
        outcome,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startedAtMs,
        steps,
        notes,
        logsArtifact: logsArtifact ?? `local/${combo.id}.log`,
      };

      mkdirSync(resultsDir, { recursive: true });
      writeFileSync(join(resultsDir, `${combo.id}.json`), `${JSON.stringify(result, null, 2)}\n`);
      return result;
    }
  } finally {
    killProcessTree(serverProcess);
  }
}

function parseArgs(argv) {
  const get = (prefix) => argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
  return {
    comboId: get("--combo="),
    tarballsPath: get("--tarballs="),
    tarballsDir: get("--tarballs-dir="),
    logsArtifact: get("--logs-artifact="),
  };
}

async function main() {
  const { comboId, tarballsPath, tarballsDir, logsArtifact } = parseArgs(process.argv.slice(2));
  if (!comboId) {
    console.error(
      "[run-combination] Usage: node run-combination.mjs --combo=<id> " +
        "[--tarballs=<path.json> | --tarballs-dir=<dir>] [--logs-artifact=<value>]",
    );
    process.exitCode = 1;
    return;
  }

  const result = await runCombination({ comboId, tarballsPath, tarballsDir, logsArtifact });
  console.log(`[run-combination] "${comboId}" -> ${result.outcome}`);
  if (result.notes) console.log(`[run-combination] notes: ${result.notes}`);
  // The *combination* can fail without the *script* failing (CI reads the
  // result file's `outcome`) — but a non-zero exit for a failing combination
  // is still useful for a human running this locally, so surface it there too
  // without affecting how aggregate-results.mjs consumes the JSON.
  if (result.outcome !== "pass") process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
