import { CORE_VERSION } from "@cookieyes/core";

/**
 * Don't let a mismatched pair fail silently.
 *
 * The `peerDependencies` range catches a genuine mismatch at install time, but
 * not a forced install, a hoisted duplicate copy of core, or a monorepo that
 * resolved a different version than the app ships. In those cases the harness
 * would happily test against rules the consumer isn't running — the exact
 * "fail silently with no explanation" the acceptance criterion is about.
 *
 * Kept as a pure function over an explicit version string so the comparison is
 * testable without building anything or faking a module.
 */

/** Must stay in step with `peerDependencies["@cookieyes/core"]` — asserted by a test. */
export const SUPPORTED_CORE_RANGE = ">=0.3.0 <1.0.0";

/** The sentinel core ships in source; see `core/src/version.ts`. */
const DEV_SENTINEL = "0.0.0-dev";

type Parsed = { major: number; minor: number; patch: number };

/** Parse `x.y.z`, ignoring any prerelease/build suffix. Null when unrecognisable. */
function parse(version: string): Parsed | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) return null;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

/** Parse the `>=a.b.c <d.0.0` range this package was built against. */
function parseRange(range: string): { min: Parsed; maxMajorExclusive: number } | null {
  const min = /(>=)\s*(\d+\.\d+\.\d+)/.exec(range);
  const max = /<\s*(\d+)\./.exec(range);
  const parsedMin = min?.[2] ? parse(min[2]) : null;
  if (!parsedMin || !max?.[1]) return null;
  return { min: parsedMin, maxMajorExclusive: Number(max[1]) };
}

function isBelow(found: Parsed, min: Parsed): boolean {
  if (found.major !== min.major) return found.major < min.major;
  if (found.minor !== min.minor) return found.minor < min.minor;
  return found.patch < min.patch;
}

/**
 * The warning text for a mismatched pair, or `null` when the pair is fine.
 *
 * Silent (returns `null`) in two cases where warning would be wrong rather than
 * helpful: the dev sentinel, which means core is being read from source and has
 * no meaningful version; and a version string we can't parse, where guessing
 * would produce a false alarm.
 */
export function coreVersionWarning(
  coreVersion: string = CORE_VERSION,
  range: string = SUPPORTED_CORE_RANGE,
): string | null {
  if (coreVersion === DEV_SENTINEL) return null;

  const found = parse(coreVersion);
  const bounds = parseRange(range);
  if (!found || !bounds) return null;

  const tooNew = found.major >= bounds.maxMajorExclusive;
  const tooOld = isBelow(found, bounds.min);
  if (!tooNew && !tooOld) return null;

  return (
    `[@cookieyes/test] This version of @cookieyes/test expects @cookieyes/core ` +
    `${range}, but the installed core is ${coreVersion}. Your tests are running ` +
    `against a different engine than the one you ship, so a passing test may not ` +
    `mean what you think. Align the two — see the compatibility table in ` +
    `@cookieyes/test's README.`
  );
}

let warned = false;

/**
 * Emit the mismatch warning at most once per process. Never throws: a version
 * mismatch should be loud, not fatal, per the repo's error-handling standard.
 */
export function warnOnCoreVersionMismatch(): void {
  if (warned) return;
  const message = coreVersionWarning();
  if (message === null) return;
  warned = true;
  if (typeof console !== "undefined") console.warn(message);
}

/** @internal test-only — resets the once-per-process latch between cases. */
export function _resetCoreVersionWarning(): void {
  warned = false;
}
