import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// Two entries: the main one is a client module ("use client"), while `server`
// reads request state via next/headers and must stay server-only — so it is
// excluded from the directive.
export default createLibConfig({
  pkg,
  entries: { index: "src/index.ts", server: "src/server.ts" },
  useClient: true,
  useClientExclude: ["server"],
});
