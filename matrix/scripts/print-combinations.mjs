#!/usr/bin/env node
// matrix/scripts/print-combinations.mjs
//
// D3 — the workflow reads the config, never duplicates it. Emits the combo
// IDs for a given subset ("fast" | "full") as a JSON array, consumed directly
// by GitHub Actions' `fromJson()` to build the "run" job's dynamic matrix
// (§5.6). Adding a new dimension/combination means editing
// matrix.config.mjs — no YAML file ever lists a combo ID (Story 1 AC3).
//
// Usage:
//   node matrix/scripts/print-combinations.mjs --subset=fast
//   node matrix/scripts/print-combinations.mjs --subset=full
// Prints: ["next-16.3.0-react-19.2.8"]   (fast, today's config)
// Exits 1 if `--subset` is missing or not "fast"/"full", or if the resulting
// set is empty (a config that defines no combination for that subset would
// otherwise silently produce a matrix job with zero legs — worse than
// failing loudly).

import { fileURLToPath } from "node:url";
import { combinations } from "../matrix.config.mjs";

const VALID_SUBSETS = new Set(["fast", "full"]);

export function selectCombinationIds(allCombinations, subset) {
  return allCombinations.filter((combo) => combo.subsets.includes(subset)).map((combo) => combo.id);
}

function parseSubset(argv) {
  const flag = argv.find((arg) => arg.startsWith("--subset="));
  return flag ? flag.slice("--subset=".length) : undefined;
}

function main() {
  const subset = parseSubset(process.argv.slice(2));
  if (!subset || !VALID_SUBSETS.has(subset)) {
    console.error(
      `[print-combinations] --subset must be one of ${[...VALID_SUBSETS].join(", ")}; got ${JSON.stringify(subset)}.`,
    );
    process.exitCode = 1;
    return;
  }

  const ids = selectCombinationIds(combinations, subset);
  if (ids.length === 0) {
    console.error(
      `[print-combinations] No combination in matrix.config.mjs declares subsets including "${subset}".`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify(ids)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
