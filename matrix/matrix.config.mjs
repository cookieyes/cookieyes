// matrix/matrix.config.mjs
//
// Single source of truth for the peer-dependency compatibility matrix
// (DEVP-80). Every script and workflow reads this file; none of them
// duplicate a combination ID or a version string of their own — extending the
// matrix (a new Node version, a new package manager, a new module-resolution
// mode) means editing `dimensions`/`combinations` here, nothing else
// (Story 1 AC3). See ai-context/designs/peer-dependency-matrix.md §5.1.

export const dimensions = {
  // Varied today.
  framework: ["next", "react", "reactDom", "typesReact", "typesReactDom"],
  // Reserved — add a value here (and to one or more `combinations` entries) to
  // extend the matrix. No script or workflow file needs to change for this
  // (Story 1 AC3): `print-combinations.mjs` and `run-combination.mjs` both
  // read `node`/`packageManager`/`moduleResolution` off each combination
  // object, never off a hardcoded list.
  node: ["20"],
  packageManager: ["pnpm@10.22.0"],
  moduleResolution: ["bundler"],
};

/**
 * @typedef {{
 *   id: string,
 *   role: "floor" | "middle" | "newest",
 *   label: string,
 *   packagesUnderTest: string[],
 *   versions: {
 *     next: string,
 *     react: string,
 *     reactDom: string,
 *     typesReact: string,
 *     typesReactDom: string,
 *   },
 *   node: string,
 *   packageManager: string,
 *   moduleResolution: string,
 *   subsets: ("fast" | "full")[],
 * }} Combination
 */

/**
 * Exact pins, no `^`/`>=`, for `next`/`react`/`reactDom` on every leg
 * (Story 2 AC3). The floor leg's `versions.react === "18.0.0"` is checked as a
 * literal string equality in `derive-check.mjs`, not a semver-satisfies check
 * — that is what stops the floor silently drifting upward over time.
 *
 * `typesReact`/`typesReactDom` use `^` ranges deliberately (they are
 * accessory type packages, not the peer dependency under test), but
 * `derive-check.mjs` (static) and `run-combination.mjs` (dynamic, post-
 * install) both assert the resolved major matches the runtime React major
 * regardless of which patch a `^` range resolves to — see §5.3/§5.4.
 *
 * @type {Combination[]}
 */
export const combinations = [
  {
    id: "next-14.0.0-react-18.0.0",
    role: "floor",
    label: "Next 14.0.0 + React 18.0.0 (declared floor)",
    packagesUnderTest: ["@cookieyes/react", "@cookieyes/nextjs"],
    versions: {
      next: "14.0.0",
      react: "18.0.0",
      reactDom: "18.0.0",
      typesReact: "^18.3.0",
      typesReactDom: "^18.3.0",
    },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "next-15.5.24-react-18.3.1",
    role: "middle",
    label: "Next 15.5.24 + React 18.3.1",
    packagesUnderTest: ["@cookieyes/react", "@cookieyes/nextjs"],
    versions: {
      next: "15.5.24",
      react: "18.3.1",
      reactDom: "18.3.1",
      typesReact: "^18.3.0",
      typesReactDom: "^18.3.0",
    },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "next-16.3.0-react-19.2.8",
    role: "newest",
    label: "Next 16.3.0 + React 19.2.8 (matches apps/web today)",
    packagesUnderTest: ["@cookieyes/react", "@cookieyes/nextjs"],
    versions: {
      next: "16.3.0",
      react: "19.2.8",
      reactDom: "19.2.8",
      typesReact: "^19.2.17",
      typesReactDom: "^19.2.3",
    },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["fast", "full"],
  },
];

// `subsets` is how the fast/full split (§5.5) is expressed without a second
// config file:
//   - "full"  = every combination, run on workflow_dispatch, a weekly
//     schedule, and required before a release. Only a successful full run on
//     `main` may update the committed matrix/matrix-results.json.
//   - "fast"  = only the "newest" combination (what this repo already
//     develops against per apps/web/package.json). Runs on every PR touching
//     sdk/react/**, sdk/nextjs/**, sdk/core/** or matrix/**. The floor and
//     middle legs exercise old, effectively-frozen API surface (Next 14/15,
//     React 18) a typical PR is very unlikely to regress; the newest leg is
//     exactly what's being actively developed and most likely to break from
//     today's change. Paying a 3x install/build cost on every PR for
//     marginal extra safety isn't worth the feedback-loop cost — the full
//     sweep is the periodic, pre-release safety net for the other two legs.
//     The fast run's result is never written into matrix-results.json (it's
//     deliberately partial); it only blocks merge on failure.
