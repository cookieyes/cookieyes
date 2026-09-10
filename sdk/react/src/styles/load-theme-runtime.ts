/**
 * The only static reference to `theme-runtime.ts` anywhere in the package.
 *
 * It lives in its own module so `runtime.ts` and `useThemeVars.ts` can both
 * start the fetch without importing each other — `useThemeVars` already takes
 * a type from `runtime.ts`, and a value import back the other way would be a
 * genuine cycle rather than an erased one.
 *
 * Nothing here may import `./theme-runtime.js` statically. That import is what
 * would put `computeThemeVars` and the WCAG maths back in the initial download
 * for every consumer, which is the whole point of the split.
 */
let pending: Promise<typeof import("./theme-runtime.js")> | null = null;

/**
 * Start (or join) the load of the custom-theme runtime.
 *
 * Memoised, so the chunk is fetched at most once per page and every later
 * caller resolves in a microtask. Called from two places: `mountRuntime` the
 * moment a `theme` is seen in the configuration, and `useThemeVars` when it
 * actually has an element to write to. The first exists so the two overlap —
 * without it a themed consumer would wait for hydration *and then* a chunk
 * fetch before their brand colours landed.
 */
export function loadThemeRuntime(): Promise<typeof import("./theme-runtime.js")> {
  pending ??= import("./theme-runtime.js");
  return pending;
}
