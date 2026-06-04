import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    en: "src/en.ts",
    es: "src/es.ts",
    fr: "src/fr.ts",
    de: "src/de.ts",
    it: "src/it.ts",
  },
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: "es2020",
});
