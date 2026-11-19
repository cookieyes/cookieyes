import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// One file per module, so a component the app never imports drops out of its
// bundle. No "use client" directive: that is a React Server Components marker.
export default createLibConfig({ pkg, preserveModules: true });
