import { type CategoryDef, resolveCategories } from "@cookieyes/core";

/**
 * Replaced at package build time with `script.ts` bundled and minified, by the `prepaint` plugin in
 * `rollup.config.mjs`. In tests, which run against source, it is the sentinel itself.
 */
const SCRIPT = "__CY_PREPAINT__";

/**
 * @internal The head script that decides, before first paint, whether a page shared by every
 * visitor shows its banner shell. The expected taxonomy comes from the same `resolveCategories`
 * the runtime calls, so an invalid custom list falls back here exactly as it does there.
 */
export function _prepaintScript(categories: CategoryDef[] | undefined): string {
  const { taxonomyHash, isDefault } = resolveCategories(categories);
  return SCRIPT.replace("__CY_TAX__", () => JSON.stringify(taxonomyHash)).replace(
    "__CY_DEFAULT__",
    () => (isDefault ? "!0" : "!1"),
  );
}
