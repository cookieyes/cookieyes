import * as React from "react";

const DOCS_URL = "https://github.com/cookieyes/cookieyes#compatibility";
const warned = new Set<string>();

/**
 * Newest React major this SDK's CI matrix has actually verified — kept in sync with
 * matrix/matrix.config.mjs by matrix/scripts/__tests__/warning-constant-sync.test.mjs, which fails
 * if this constant and the matrix's highest pinned React major disagree.
 */
const HIGHEST_VERIFIED_REACT_MAJOR = 19;

/** Oldest React major this SDK declares support for — mirrors `peerDependencies: react >=18.0.0`. */
const LOWEST_SUPPORTED_REACT_MAJOR = 18;

/**
 * Dev-only: warns once per unique React version when the installed React falls outside what this
 * SDK has verified — either BELOW the declared floor, or ABOVE the newest major the CI matrix has
 * exercised. Both directions matter, and for different reasons.
 *
 * Below the floor is not covered by peerDependencies resolution in practice: DEVP-70 Story 6 is
 * explicit that "package managers vary in how loudly they surface a mismatch, and some will install
 * regardless with only a passing note" — `--legacy-peer-deps`, `--force`, and several package
 * managers' defaults all install React 17 against a `>=18.0.0` peer without stopping anyone. That
 * developer would otherwise get silence here and a confusing runtime failure later, which is the
 * exact outcome this warning exists to replace.
 *
 * The `typeof process === "undefined"` half of the guard matters, not just the `NODE_ENV` half:
 * this SDK also ships to consumers with no bundler define step for `process.env` (a raw `<script>`
 * load), where the check itself would otherwise throw a ReferenceError.
 *
 * Next.js version compatibility is NOT checked here — see the module doc comment below for why —
 * the published compatibility table (README) is the only source of truth for that half.
 */
export function warnOnUntestedReactVersion(): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV === "production") return;
  if (typeof console === "undefined") return;
  const major = Number.parseInt(React.version.split(".")[0] ?? "", 10);
  if (!Number.isFinite(major)) return;
  const tooOld = major < LOWEST_SUPPORTED_REACT_MAJOR;
  const tooNew = major > HIGHEST_VERIFIED_REACT_MAJOR;
  if (!tooOld && !tooNew) return;
  if (warned.has(React.version)) return;
  warned.add(React.version);
  console.warn(
    tooOld
      ? `[cookieyes] You're running React ${React.version}, which is below this SDK's supported ` +
          `floor of React ${LOWEST_SUPPORTED_REACT_MAJOR}.0.0. Your package manager installed it ` +
          `anyway (several do, with only a passing note). This combination is not tested and parts ` +
          `of the SDK may fail silently rather than error. See ${DOCS_URL} for the tested matrix.`
      : `[cookieyes] You're running React ${React.version}. This SDK's CI matrix has verified up ` +
          `through React ${HIGHEST_VERIFIED_REACT_MAJOR}.x — newer majors likely work (the SDK ` +
          `avoids version-specific APIs) but haven't been verified yet. See ${DOCS_URL} for the ` +
          `tested matrix.`,
  );
}

/**
 * Next.js version cannot be reliably detected from `@cookieyes/react` at all — it's
 * framework-agnostic and imports nothing from `next`. It *could* in principle be added to
 * `@cookieyes/nextjs` by reading `next/package.json`, but that would mean a `"use client"` runtime
 * module statically or dynamically importing `next` purely to read a version string — exactly the
 * kind of dependency `sdk/nextjs/src/server.ts` deliberately avoids by using a dynamic
 * `import("next/headers")` only when actually needed. Next's package export map also doesn't
 * guarantee `next/package.json` is resolvable from every supported version's client bundle. This
 * half of Story 6 is scoped out, not attempted — the React-only warning plus the published README
 * table together cover the practical need; a silently-wrong "detected Next version" would be worse
 * than no detection.
 */
