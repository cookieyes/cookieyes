import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// Each locale is its own entry / sub-path so unused languages never bundle.
// Every src/<code>.ts other than index.ts is a locale, so adding the file is
// enough to build it; locales.test.ts checks the matching package.json export.
const locales = readdirSync(new URL("./src", import.meta.url))
  .filter((file) => file.endsWith(".ts") && file !== "index.ts")
  .map((file) => file.slice(0, -".ts".length));

export default createLibConfig({
  pkg,
  entries: {
    index: "src/index.ts",
    ...Object.fromEntries(locales.map((code) => [code, `src/${code}.ts`])),
  },
});
