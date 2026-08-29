// matrix/scripts/lib/versions.mjs
//
// Shared helpers for reading resolved package versions off disk and comparing
// semver majors. Used by both the static config-time check
// (derive-check.mjs) and the dynamic post-install check (run-combination.mjs)
// — see ai-context/designs/peer-dependency-matrix.md §5.3 step 6, §5.4.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read `<packageName>/package.json`'s `version` field from a given
 * `node_modules` root. Returns `null` if the package isn't installed there or
 * its `package.json` is missing/malformed — callers decide how to fail.
 *
 * @param {string} nodeModulesDir - Absolute path to a `node_modules` directory.
 * @param {string} packageName - e.g. "react", "@types/react".
 * @returns {string | null}
 */
export function readResolvedVersion(nodeModulesDir, packageName) {
  const pkgJsonPath = join(nodeModulesDir, ...packageName.split("/"), "package.json");
  try {
    const raw = readFileSync(pkgJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

/**
 * The major version number from a semver-ish string ("19.2.8" -> 19,
 * "^18.3.0" -> 18). Returns `null` for anything unparsable.
 *
 * @param {string} version
 * @returns {number | null}
 */
export function majorOf(version) {
  const match = /(\d+)\.\d+\.\d+/.exec(version);
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

/**
 * True when two version strings share the same major, per {@link majorOf}.
 * `false` whenever either side fails to parse — never silently "matches".
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function majorsMatch(a, b) {
  const majorA = majorOf(a);
  const majorB = majorOf(b);
  return majorA !== null && majorB !== null && majorA === majorB;
}
