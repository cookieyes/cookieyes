import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// One file per module, so the `import()` of `dialogs.ts` stays a separate file
// and a page whose visitors only ever see the banner never downloads the
// preferences and opt-out dialogs.
export default createLibConfig({ pkg, preserveModules: true });
