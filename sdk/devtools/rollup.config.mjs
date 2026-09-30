import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

export default createLibConfig({
  pkg,
  entries: { index: "src/index.ts", stub: "src/stub.ts" },
  useClient: true,
});
