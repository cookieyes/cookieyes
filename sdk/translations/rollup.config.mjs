import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const pkg = createRequire(import.meta.url)("./package.json");

// Each locale is its own entry / sub-path so unused languages never bundle.
export default createLibConfig({
  pkg,
  entries: {
    index: "src/index.ts",
    en: "src/en.ts",
    es: "src/es.ts",
    fr: "src/fr.ts",
    de: "src/de.ts",
    it: "src/it.ts",
  },
});
