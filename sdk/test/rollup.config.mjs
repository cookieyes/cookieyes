import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// Two entries: the headless harness, and the React one. No `useClient` — this is
// test-only code and never reaches an RSC bundle.
export default createLibConfig({
  pkg,
  entries: { index: "src/index.ts", react: "src/react.ts" },
});
