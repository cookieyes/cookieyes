import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

export default createLibConfig({
  pkg,
  /**
   * Every optional subsystem that must be able to leave a consumer's bundle
   * needs its own entry here.
   *
   * Rollup flattens a module into the main chunk as soon as anything statically
   * reachable from `src/index.ts` imports it — and the barrel re-exports both of
   * these. Without an entry, `integrations`' dynamic `import()` is inlined (it
   * emitted no second chunk at all and made `index.js` 317 bytes *larger*), and
   * `network-blocker` cannot be reached by its own subpath. See
   * `tools/size/README.md` and `src/network-blocker-slot.ts`.
   */
  entries: {
    index: "src/index.ts",
    integrations: "src/integrations.ts",
    "network-blocker": "src/network-blocker.ts",
  },
});
