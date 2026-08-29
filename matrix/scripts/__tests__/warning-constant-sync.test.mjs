// matrix/scripts/__tests__/warning-constant-sync.test.mjs
//
// Asserts sdk/react/src/diagnostics/peer-version-warning.ts's
// `HIGHEST_VERIFIED_REACT_MAJOR` constant matches matrix.config.mjs's
// highest pinned React major. If someone bumps the matrix's "newest" combo
// to a new React major without updating the warning's threshold (or vice
// versa), the dev-only warning would start firing false positives (or stop
// firing true ones) — this test is the tripwire.
//
// The constant is read via a small, deliberate regex over the source text
// rather than an import: this test lives under matrix/ (a separate,
// non-workspace tree — see ai-context/designs/peer-dependency-matrix.md §2
// D2) and `HIGHEST_VERIFIED_REACT_MAJOR` is intentionally a private,
// unexported module constant in sdk/react/src — the file this repo's other
// concurrent work owns. Reading its source text, not importing it, avoids
// requiring an export that file doesn't otherwise need and avoids adding a
// runtime dependency from matrix/ scripts onto sdk/react/src.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { combinations } from "../../matrix.config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const warningFilePath = join(
  repoRoot,
  "sdk",
  "react",
  "src",
  "diagnostics",
  "peer-version-warning.ts",
);

function readHighestVerifiedReactMajor() {
  const source = readFileSync(warningFilePath, "utf8");
  const match = /HIGHEST_VERIFIED_REACT_MAJOR\s*=\s*(\d+)/.exec(source);
  if (!match) {
    throw new Error(
      `[warning-constant-sync] could not find "HIGHEST_VERIFIED_REACT_MAJOR = <number>" in ${warningFilePath}.`,
    );
  }
  return Number.parseInt(match[1], 10);
}

function highestPinnedReactMajor() {
  const majors = combinations.map((combo) => {
    const match = /^(\d+)\./.exec(combo.versions.react);
    if (!match) {
      throw new Error(
        `[warning-constant-sync] combination "${combo.id}" has an unparseable versions.react: "${combo.versions.react}".`,
      );
    }
    return Number.parseInt(match[1], 10);
  });
  return Math.max(...majors);
}

describe("HIGHEST_VERIFIED_REACT_MAJOR stays in sync with matrix.config.mjs", () => {
  it("matches the highest React major pinned by any combination", () => {
    const constantValue = readHighestVerifiedReactMajor();
    const matrixMax = highestPinnedReactMajor();
    expect(
      constantValue,
      `sdk/react/src/diagnostics/peer-version-warning.ts's HIGHEST_VERIFIED_REACT_MAJOR is ` +
        `${constantValue}, but matrix.config.mjs's highest pinned combination is React ${matrixMax}.x. ` +
        "Update whichever one is stale.",
    ).toBe(matrixMax);
  });
});
