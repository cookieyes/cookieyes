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
  framework: [
    "next",
    "react",
    "reactDom",
    "typesReact",
    "typesReactDom",
    "vue",
    "nuxt",
    "svelte",
    "kit",
  ],
  // Reserved — add a value here (and to one or more `combinations` entries) to
  // extend the matrix. No script or workflow file needs to change for this
  // (Story 1 AC3): `print-combinations.mjs` and `run-combination.mjs` both
  // read `node`/`packageManager`/`moduleResolution` off each combination
  // object, never off a hardcoded list.
  node: ["20", "22"],
  packageManager: ["pnpm@10.22.0"],
  moduleResolution: ["bundler"],
};

/**
 * @typedef {{
 *   id: string,
 *   role: "floor" | "middle" | "newest",
 *   label: string,
 *   app?: "next" | "vue" | "nuxt" | "svelte" | "sveltekit",
 *   packagesUnderTest: string[],
 *   versions: {
 *     next?: string,
 *     react?: string,
 *     reactDom?: string,
 *     typesReact?: string,
 *     typesReactDom?: string,
 *     vue?: string,
 *     nuxt?: string,
 *     svelte?: string,
 *     vite?: string,
 *     vitePluginSvelte?: string,
 *     kit?: string,
 *     adapterNode?: string,
 *     adapterStatic?: string,
 *   },
 *   node: string,
 *   packageManager: string,
 *   moduleResolution: string,
 *   subsets: ("fast" | "full")[],
 * }} Combination
 */

/**
 * Which example app a combination runs. Read through this, never off `combo.app`, so the three
 * Next.js combinations stay untouched: leaving `app` out means the Next.js app.
 *
 * @param {Combination} combo
 * @returns {"next" | "vue" | "nuxt" | "svelte" | "sveltekit"}
 */
export function appOf(combo) {
  return combo.app ?? "next";
}

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
  // The Vue legs pin only `vue`: Vite and the Vue plugin are fixed in
  // matrix/example-app-vue, not a matrix dimension. The floor's version string is compared
  // literally with `peerDependencies.vue` in sdk/vue/package.json by derive-check.mjs, and the
  // newest leg must stay the newest Vue 3.5.x that is at least 72 hours old.
  {
    id: "vue-3.5.0",
    role: "floor",
    label: "Vue 3.5.0 (declared floor)",
    app: "vue",
    packagesUnderTest: ["@cookieyes/vue"],
    versions: { vue: "3.5.0" },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "vue-3.5.45",
    role: "newest",
    label: "Vue 3.5.45",
    app: "vue",
    packagesUnderTest: ["@cookieyes/vue"],
    versions: { vue: "3.5.45" },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["fast", "full"],
  },
  // The Nuxt legs pin only `nuxt`. Nuxt depends on Vue itself, so the Vue these legs run is the
  // one Nuxt resolves, recorded in the result's `resolved.vue`; derive-check.mjs therefore does
  // not ask a Nuxt leg to pin @cookieyes/nuxt's own `vue` floor. The floor's version string is
  // compared literally with `peerDependencies.nuxt` in sdk/nuxt/package.json, and the newest leg
  // must stay the newest Nuxt 4.x that is at least 72 hours old. They run on Node 22: Nuxt 4.6
  // declares `node: ^22.22.3 || ^24.15.0 || >=26.0.0` and its typecheck and build fail on Node 20.
  {
    id: "nuxt-4.0.0",
    role: "floor",
    label: "Nuxt 4.0.0 (declared floor)",
    app: "nuxt",
    packagesUnderTest: ["@cookieyes/nuxt"],
    versions: { nuxt: "4.0.0" },
    node: "22",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "nuxt-4.6.4",
    role: "newest",
    label: "Nuxt 4.6.4",
    app: "nuxt",
    packagesUnderTest: ["@cookieyes/nuxt"],
    versions: { nuxt: "4.6.4" },
    node: "22",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["fast", "full"],
  },
  // The Svelte legs pin `svelte` as the framework under test, plus `vite` and `vitePluginSvelte`
  // as tool pins: the floor's Vite 7 and plugin 6 are the newest pair that still accept the
  // floor, while the newest leg runs the current pair, so the two legs also cover both toolchains.
  // The floor's `svelte` is compared literally with `peerDependencies.svelte` in
  // sdk/svelte/package.json by derive-check.mjs, and the newest leg must stay the newest Svelte
  // 5.x that is at least 72 hours old.
  {
    id: "svelte-5.20.0",
    role: "floor",
    label: "Svelte 5.20.0 (declared floor)",
    app: "svelte",
    packagesUnderTest: ["@cookieyes/svelte"],
    versions: { svelte: "5.20.0", vite: "7.3.8", vitePluginSvelte: "6.2.4" },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "svelte-5.57.3",
    role: "newest",
    label: "Svelte 5.57.3",
    app: "svelte",
    packagesUnderTest: ["@cookieyes/svelte"],
    versions: { svelte: "5.57.3", vite: "8.3.7", vitePluginSvelte: "7.3.1" },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["fast", "full"],
  },
  // The SvelteKit legs pin `kit` and `svelte` (the two peers of @cookieyes/sveltekit) plus the
  // tool pins a Kit app needs: Vite, the Svelte plugin and the two adapters. Each leg's tools are
  // the newest ones its Kit accepts: Kit 2.62 runs on Vite 7 and plugin 6, while Kit 3 needs Vite
  // 8, plugin 7 and Node 22.17, and its adapters are a major ahead (adapter-node 6, adapter-static
  // 4). The floor pins both peers in one combination, which derive-check.mjs compares literally
  // with `peerDependencies` in sdk/sveltekit/package.json. The middle leg is the newest Kit 2.x and
  // the newest leg the newest Kit 3.x, each at least 72 hours old when written.
  {
    id: "sveltekit-2.62.0-svelte-5.20.0",
    role: "floor",
    label: "SvelteKit 2.62.0 + Svelte 5.20.0 (declared floor)",
    app: "sveltekit",
    packagesUnderTest: ["@cookieyes/svelte", "@cookieyes/sveltekit"],
    versions: {
      kit: "2.62.0",
      svelte: "5.20.0",
      vite: "7.3.8",
      vitePluginSvelte: "6.2.4",
      adapterNode: "5.5.8",
      adapterStatic: "3.0.11",
    },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "sveltekit-2.70.4-svelte-5.57.3",
    role: "middle",
    label: "SvelteKit 2.70.4 + Svelte 5.57.3",
    app: "sveltekit",
    packagesUnderTest: ["@cookieyes/svelte", "@cookieyes/sveltekit"],
    versions: {
      kit: "2.70.4",
      svelte: "5.57.3",
      vite: "8.3.7",
      vitePluginSvelte: "7.3.1",
      adapterNode: "5.5.8",
      adapterStatic: "3.0.11",
    },
    node: "20",
    packageManager: "pnpm@10.22.0",
    moduleResolution: "bundler",
    subsets: ["full"],
  },
  {
    id: "sveltekit-3.2.0-svelte-5.57.3",
    role: "newest",
    label: "SvelteKit 3.2.0 + Svelte 5.57.3",
    app: "sveltekit",
    packagesUnderTest: ["@cookieyes/svelte", "@cookieyes/sveltekit"],
    versions: {
      kit: "3.2.0",
      svelte: "5.57.3",
      vite: "8.3.7",
      vitePluginSvelte: "7.3.1",
      adapterNode: "6.0.2",
      adapterStatic: "4.0.1",
    },
    node: "22",
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
