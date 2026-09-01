#!/usr/bin/env node
// matrix/scripts/derive-check.mjs
//
// Story 2 AC1/AC2/AC3 enforcement — the single most important structural
// requirement of DEVP-80: widening a `peerDependencies` range without adding
// a matching matrix combination MUST fail the build. Runs with zero installs
// (parses `package.json`/config text only) — cheap enough for every PR.
//
// See ai-context/designs/peer-dependency-matrix.md §5.3 for the full spec.
//
// Usage: node matrix/scripts/derive-check.mjs
// Exit code 0 = every check passed. Exit code 1 = at least one violation,
// printed to stderr, naming the exact package/field/value involved.
//
// The checking logic itself (`checkPeerDependencyMatrix`) is a pure function
// of fixture-friendly inputs, exported for
// `matrix/scripts/__tests__/derive-check.test.mjs` — everything below it is
// just wiring: reading the real package.json files and matrix.config.mjs,
// and turning the result into a process exit code.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

/** Maps a `peerDependencies` key to the matching field on a combination's `versions`. */
export const PEER_FIELD_MAP = {
  next: "next",
  react: "react",
  "react-dom": "reactDom",
};

/** Combinations that actually claim to test `packageName` (Story 1 AC3 future-proofing). */
function combinationsUnderTest(combinations, packageName) {
  return combinations.filter((combo) => combo.packagesUnderTest.includes(packageName));
}

/**
 * Pure check: given the peer-dependency-bearing packages (name +
 * `peerDependencies` object) and the matrix's combinations, returns an array
 * of human-readable violation messages. Empty array = fully consistent.
 *
 * @param {{ peerPackages: Array<{ name: string, peerDependencies: Record<string, string> }>,
 *   combinations: import("../matrix.config.mjs").Combination[] }} input
 * @returns {string[]}
 */
export function checkPeerDependencyMatrix({ peerPackages, combinations }) {
  const errors = [];

  // --- Floor-exists check (AC1/AC3) + inverse check (AC2 headline requirement) ---
  for (const { name, peerDependencies } of peerPackages) {
    const relevantCombos = combinationsUnderTest(combinations, name);

    for (const [peerName, range] of Object.entries(peerDependencies ?? {})) {
      const field = PEER_FIELD_MAP[peerName];
      if (!field) {
        errors.push(
          `${name}: peerDependencies."${peerName}" has no matrix.config.mjs field mapping — ` +
            `add "${peerName}" to PEER_FIELD_MAP in matrix/scripts/derive-check.mjs and a ` +
            "corresponding field on Combination.versions before this can be verified.",
        );
        continue;
      }

      const floor = semver.minVersion(range);
      if (!floor) {
        errors.push(
          `${name}: peerDependencies."${peerName}" = "${range}" is not a parseable semver range.`,
        );
        continue;
      }
      const floorStr = floor.version;

      const floorCombo = relevantCombos.find((combo) => combo.versions[field] === floorStr);
      if (!floorCombo) {
        errors.push(
          `${name}: peerDependencies."${peerName}" declares a floor of "${floorStr}" (from range ` +
            `"${range}"), but no combination in matrix.config.mjs pins versions.${field} === ` +
            `"${floorStr}" exactly. Either add a combination pinning that exact floor, or this ` +
            "range was widened/narrowed without updating the matrix.",
        );
      }
    }

    // Inverse check: every combination's pinned next/react/reactDom must
    // satisfy the package's declared peer range — catches a matrix
    // combination testing something the package.json doesn't actually
    // promise (e.g. a stale floor left behind after a real range bump).
    for (const combo of relevantCombos) {
      for (const [peerName, range] of Object.entries(peerDependencies ?? {})) {
        const field = PEER_FIELD_MAP[peerName];
        if (!field) continue;
        const pinned = combo.versions[field];
        if (pinned === undefined) continue;
        if (!semver.satisfies(pinned, range, { includePrerelease: true })) {
          errors.push(
            `matrix.config.mjs combination "${combo.id}" pins versions.${field} = "${pinned}", ` +
              `which does not satisfy ${name}'s peerDependencies."${peerName}" = "${range}". ` +
              "Either the combination is stale (the peer range moved) or the pinned version is wrong.",
          );
        }
      }
    }
  }

  // --- Type-package major check (static half, Story 4 / coordinator finding) ---
  //
  // For every combination, the resolved major of `typesReact`/`typesReactDom`
  // must equal the resolved major of `react`/`reactDom`. Config-authoring
  // mistake check, install-free; the dynamic half (what actually got
  // installed) lives in run-combination.mjs.
  for (const combo of combinations) {
    const pairs = [
      ["typesReact", "react"],
      ["typesReactDom", "reactDom"],
    ];
    for (const [typesField, runtimeField] of pairs) {
      const typesRange = combo.versions[typesField];
      const runtimeVersion = combo.versions[runtimeField];
      const typesMin = semver.minVersion(typesRange);
      const runtimeMin = semver.minVersion(runtimeVersion);
      if (!typesMin || !runtimeMin) {
        errors.push(
          `matrix.config.mjs combination "${combo.id}": could not parse versions.${typesField} ` +
            `("${typesRange}") or versions.${runtimeField} ("${runtimeVersion}") as semver.`,
        );
        continue;
      }
      if (typesMin.major !== runtimeMin.major) {
        errors.push(
          `matrix.config.mjs combination "${combo.id}": versions.${typesField} = "${typesRange}" ` +
            `(major ${typesMin.major}) does not match versions.${runtimeField} = "${runtimeVersion}" ` +
            `(major ${runtimeMin.major}) — a leg that installs this combination would type-check ` +
            "against the wrong React major and produce a false pass.",
        );
      }
    }
  }

  return errors;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..");
  const { combinations } = await import("../matrix.config.mjs");

  const peerPackages = [
    { name: "@cookieyes/react", path: join(repoRoot, "sdk", "react", "package.json") },
    { name: "@cookieyes/nextjs", path: join(repoRoot, "sdk", "nextjs", "package.json") },
  ].map(({ name, path }) => {
    const pkg = JSON.parse(readFileSync(path, "utf8"));
    return { name, peerDependencies: pkg.peerDependencies ?? {} };
  });

  const errors = checkPeerDependencyMatrix({ peerPackages, combinations });

  if (errors.length > 0) {
    console.error(`[derive-check] ${errors.length} violation(s) found:\n`);
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
    console.error(
      "\n[derive-check] The peer-dependency matrix must derive from — and stay in sync with — " +
        "each package's declared peerDependencies. See ai-context/designs/peer-dependency-matrix.md §5.3.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `[derive-check] OK — ${combinations.length} combination(s) checked against ${peerPackages.length} ` +
      "package(s)' declared peerDependencies. Floors covered, ranges satisfied, type packages aligned.",
  );
}

// Only run the CLI when this module is the entry point — not when imported by
// the test suite.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
