import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// One file per module, so the `import()` of `styles/theme-runtime.ts` stays a
// separate file and an app that never sets a `theme` never downloads it. No
// "use client": nothing here is React, and the markup renderer must also run
// on a server.
export default createLibConfig({ pkg, preserveModules: true });
