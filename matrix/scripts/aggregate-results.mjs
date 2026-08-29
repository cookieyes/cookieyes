#!/usr/bin/env node

// matrix/scripts/aggregate-results.mjs
//
// Merges every combination's matrix/results/<id>.json into the single
// matrix-results.json contract file DEVP-70's README generator reads
// (§8). Fail-closed (D6, same discipline as apps/web's generators): refuses
// to write anything if a configured combination is missing from the
// collected per-combo results, or if the merged set would be empty.
//
// Usage:
//   node matrix/scripts/aggregate-results.mjs --subset=<fast|full> [--write]
// Without --write, prints the would-be merged JSON to stdout without
// touching matrix/matrix-results.json — used for local inspection and by
// tests. --write is what CI's `aggregate` job (§5.6) actually runs, and only
// for `subset=full` is the output meant to replace the committed file (the
// `publish-results` CI job enforces the "only a successful full run on main"
// rule at the workflow level, not in this script).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const matrixDir = join(here, "..");
const repoRoot = join(matrixDir, "..");
const resultsDir = join(matrixDir, "results");
const resultsFilePath = join(matrixDir, "matrix-results.json");
const SCHEMA_VERSION = 1;

/** Throws — callers (main()) turn this into a non-zero exit code; kept a plain throw so
 *  buildAggregateResult() stays a pure function safe to call from tests. */
function fail(message) {
  throw new Error(`[aggregate-results] ${message}`);
}

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function configHash() {
  const configPath = join(matrixDir, "matrix.config.mjs");
  const text = readFileSync(configPath, "utf8");
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

/**
 * Merges an array of per-combo result objects (matrix/results/<id>.json
 * contents) against the currently-configured combinations, fail-closed on
 * any mismatch. Pure function — the sole seam this file's tests exercise.
 *
 * @param {{ combinations: import("../matrix.config.mjs").Combination[],
 *   perComboResults: object[], subset: "fast" | "full", commit: string,
 *   matrixConfigHash: string, generatedAt: string }} input
 */
export function buildAggregateResult({
  combinations,
  perComboResults,
  subset,
  commit,
  matrixConfigHash,
  generatedAt,
}) {
  const expectedIds = new Set(
    combinations.filter((c) => c.subsets.includes(subset)).map((c) => c.id),
  );
  const collectedIds = new Set(perComboResults.map((r) => r.id));

  const missing = [...expectedIds].filter((id) => !collectedIds.has(id));
  const unexpected = [...collectedIds].filter((id) => !expectedIds.has(id));

  if (missing.length > 0) {
    fail(
      `subset "${subset}" is missing result(s) for combination(s): ${missing.join(", ")}. ` +
        "Refusing to write a partial matrix-results.json.",
    );
  }
  if (perComboResults.length === 0) {
    fail("no per-combination results were collected — refusing to write an empty results file.");
  }
  if (unexpected.length > 0) {
    fail(
      `collected result(s) for combination(s) not in matrix.config.mjs's "${subset}" subset: ` +
        `${unexpected.join(", ")}. A stale result file from a previous config is likely mixed in.`,
    );
  }

  const orderedResults = combinations
    .filter((c) => expectedIds.has(c.id))
    .map((c) => perComboResults.find((r) => r.id === c.id));

  const pass = orderedResults.filter((r) => r.outcome === "pass").length;
  const fail_ = orderedResults.length - pass;

  return {
    $schema: "https://cookieyes.dev/schemas/peer-matrix-results.schema.json",
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    commit,
    matrixConfigHash,
    subset,
    dimensions: {
      varied: ["framework"],
      fixed: {
        node: combinations[0]?.node ?? "20",
        packageManager: combinations[0]?.packageManager ?? "pnpm@10.22.0",
        moduleResolution: combinations[0]?.moduleResolution ?? "bundler",
      },
    },
    combinations: orderedResults,
    summary: {
      total: orderedResults.length,
      pass,
      fail: fail_,
      outcome: fail_ === 0 ? "pass" : "fail",
    },
    coverageLimits: [
      "No real browser paint or hydration — SSR is asserted via server-rendered HTML/fetch only; " +
        "client behaviour is asserted in jsdom, not a browser DOM (no Playwright).",
      "Node, package-manager and module-resolution dimensions are not yet varied — every " +
        "combination above ran on Node 20 / pnpm / moduleResolution=bundler.",
    ],
  };
}

function loadPerComboResults() {
  if (!existsSync(resultsDir)) return [];
  return readdirSync(resultsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(resultsDir, f), "utf8")));
}

function parseArgs(argv) {
  const subset = argv.find((a) => a.startsWith("--subset="))?.slice("--subset=".length);
  const write = argv.includes("--write");
  return { subset, write };
}

async function main() {
  const { subset, write } = parseArgs(process.argv.slice(2));
  if (subset !== "fast" && subset !== "full") {
    console.error('[aggregate-results] --subset must be "fast" or "full".');
    process.exitCode = 1;
    return;
  }

  const { combinations } = await import("../matrix.config.mjs");
  const perComboResults = loadPerComboResults();

  let merged;
  try {
    merged = buildAggregateResult({
      combinations,
      perComboResults,
      subset,
      commit: currentCommit(),
      matrixConfigHash: configHash(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const serialized = `${JSON.stringify(merged, null, 2)}\n`;

  if (write) {
    if (subset !== "full") {
      console.error(
        '[aggregate-results] --write refused for subset "fast" — only a full run may update the ' +
          "committed matrix-results.json (§5.5). Printing to stdout instead.",
      );
      process.stdout.write(serialized);
      process.exitCode = 1;
      return;
    }
    mkdirSync(dirname(resultsFilePath), { recursive: true });
    writeFileSync(resultsFilePath, serialized);
    console.log(`[aggregate-results] Wrote ${resultsFilePath}`);
    return;
  }

  process.stdout.write(serialized);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
