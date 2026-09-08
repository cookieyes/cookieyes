import type { Integration, IntegrationHost, IntegrationRunner } from "./integrations.js";

/**
 * Load the integration runner on demand.
 *
 * The runner is the largest single subsystem in `@cookieyes/core` — 1.2 KB of
 * gzip, measured — and it does nothing at all unless `integrations` is
 * configured, which most consumers never do. `integrations.ts` is a separate
 * build entry (see `sdk/core/rollup.config.mjs`) so that this stays a real
 * `import()` in the published output rather than being flattened back into the
 * main chunk, and a bundler can therefore keep it out of the initial download.
 *
 * This indirection exists so that `@cookieyes/react` does not need a static
 * import of `runIntegrations` to do the same thing. A dynamic
 * `import("@cookieyes/core")` from the adapter would pull the whole barrel and
 * defeat the split; a static import of *this* function costs a few bytes and
 * leaves the heavy module behind one `import()` that only core knows about.
 *
 * @internal — consumed by framework adapters, not part of the public API.
 */
export async function _loadIntegrations(): Promise<{
  runIntegrations: (list: Integration[], host: IntegrationHost) => IntegrationRunner;
  warnOverlappingVendors: (ids: string[], vendors: string[]) => void;
  warnUnknownCategories: (list: Integration[], known: string[]) => void;
}> {
  const module = await import("./integrations.js");
  return {
    runIntegrations: module.runIntegrations,
    warnOverlappingVendors: module.warnOverlappingVendors,
    warnUnknownCategories: module.warnUnknownCategories,
  };
}
