import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

export default createLibConfig({
  pkg,
  /**
   * `integrations` needs its own entry for the dynamic `import()` in
   * `runtime.ts` to survive into the published output.
   *
   * Rollup flattens a module into the main chunk as soon as anything statically
   * reachable from `src/index.ts` imports it — and the barrel re-exports
   * `runIntegrations`. Without an entry the split emitted no second chunk at
   * all and made `index.js` 317 bytes *larger*. See tools/size/README.md.
   */
  entries: {
    index: "src/index.ts",
    integrations: "src/integrations.ts",
  },
});
