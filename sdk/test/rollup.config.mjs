import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// Three entries: the headless harness, the React one, and the conformance suite
// every framework adapter runs. No `useClient`: this is test-only code and
// never reaches an RSC bundle.
export default createLibConfig({
  pkg,
  entries: { index: "src/index.ts", react: "src/react.ts", conformance: "src/conformance.ts" },
});
