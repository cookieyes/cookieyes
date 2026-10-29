import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// One entry per database so an app pulls in only the store it uses. The CLI is a
// separate ESM-only build because it alone needs the shebang. Node 20 target:
// this package never runs in a browser.
export default [
  ...createLibConfig({
    pkg,
    entries: {
      index: "src/index.ts",
      memory: "src/memory.ts",
      postgres: "src/postgres.ts",
      sqlite: "src/sqlite.ts",
      node: "src/node.ts",
    },
    target: "node20",
  }),
  ...createLibConfig({
    pkg,
    entries: { cli: "src/cli.ts" },
    formats: ["esm"],
    dtsBuild: false,
    sourcemap: false,
    target: "node20",
    shebang: "#!/usr/bin/env node",
  }),
];
