import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// CLI: single ESM bin, no types/sourcemaps, Node target, shebang preserved.
export default createLibConfig({
  pkg,
  formats: ["esm"],
  dtsBuild: false,
  sourcemap: false,
  target: "node18",
  shebang: "#!/usr/bin/env node",
});
